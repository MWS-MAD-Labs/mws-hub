import { createHmac, randomUUID } from "node:crypto";
import { ResponseError } from "../error/response-error";
import { logger } from "../lib/logger";

const DEFAULT_TIMEOUT_MS = 15_000;
const CARD_ID_PATTERN = /^A[1-5]$/;

type GptCodeAction = "getAccounts" | "getAccount" | "getCode";

export type GptCodeAccount = {
  cardId: string;
  email: string;
};

export type GptCodeResult = {
  cardId: string;
  code: string;
  timestamp: string;
  subject: string;
};

type AppsScriptSuccess<T> = {
  ok: true;
  data: T;
};

type AppsScriptFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

function integrationUrl(): string {
  const raw = (
    process.env.GPT_CODE_APPS_SCRIPT_URL ||
    process.env.URL_DEPLOYMENT ||
    ""
  ).trim();

  if (!raw) {
    throw new ResponseError(
      503,
      "GPT Code Apps Script URL is not configured.",
      "gpt_code_not_configured",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ResponseError(
      503,
      "GPT Code Apps Script URL is invalid.",
      "gpt_code_not_configured",
    );
  }

  if (url.protocol !== "https:") {
    throw new ResponseError(
      503,
      "GPT Code Apps Script URL must use HTTPS.",
      "gpt_code_not_configured",
    );
  }

  return url.toString();
}

function integrationSecret(): string {
  const secret = (
    process.env.GPT_CODE_APPS_SCRIPT_SECRET ||
    process.env.HUB_HMAC_SECRET ||
    process.env.HUB_API_SECRET ||
    ""
  ).trim();

  if (!secret) {
    throw new ResponseError(
      503,
      "GPT Code Apps Script secret is not configured.",
      "gpt_code_not_configured",
    );
  }

  return secret;
}

function timeoutMs(): number {
  const configured = Number(process.env.GPT_CODE_APPS_SCRIPT_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return Math.min(configured, 30_000);
}

function normalizeCardId(cardId: string): string {
  const normalized = String(cardId || "").trim().toUpperCase();
  if (!CARD_ID_PATTERN.test(normalized)) {
    throw new ResponseError(400, "GPT card id must be A1, A2, A3, A4, or A5.");
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseAccount(value: unknown): GptCodeAccount {
  if (!isRecord(value)) {
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid account.");
  }

  const cardId = value.cardId;
  const email = value.email;
  if (
    typeof cardId !== "string" ||
    !CARD_ID_PATTERN.test(cardId) ||
    typeof email !== "string" ||
    !email.endsWith("@millennia21.id")
  ) {
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid account.");
  }

  return { cardId, email };
}

function parseAccounts(value: unknown): GptCodeAccount[] {
  if (!Array.isArray(value)) {
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid account list.");
  }
  return value.map(parseAccount);
}

function parseCodeResult(value: unknown): GptCodeResult {
  if (!isRecord(value)) {
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid code result.");
  }

  const { cardId, code, timestamp, subject } = value;
  if (
    typeof cardId !== "string" ||
    !CARD_ID_PATTERN.test(cardId) ||
    typeof code !== "string" ||
    !/^\d{6}$/.test(code) ||
    typeof timestamp !== "string" ||
    typeof subject !== "string"
  ) {
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid code result.");
  }

  return { cardId, code, timestamp, subject };
}

function upstreamFailureStatus(code: string, message: string): number {
  if (code === "INVALID_CARD_ID") return 404;
  if (
    code === "INTERNAL_ERROR" &&
    message.toLowerCase().includes("no recent verification code")
  ) {
    return 404;
  }
  if (code === "API_NOT_CONFIGURED") return 503;
  return 502;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    logger.error("GPT Code Apps Script returned non-JSON content:", response.status);
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid response.");
  }

  if (!response.ok) {
    logger.error("GPT Code Apps Script request failed:", response.status);
    throw new ResponseError(502, `GPT Code Apps Script failed with status ${response.status}.`);
  }

  if (!isRecord(body) || typeof body.ok !== "boolean") {
    throw new ResponseError(502, "GPT Code Apps Script returned an invalid response.");
  }

  if (!body.ok) {
    const failure = body as AppsScriptFailure;
    const error = isRecord(failure.error) ? failure.error : null;
    const code = error && typeof error.code === "string" ? error.code : "UPSTREAM_ERROR";
    const message = error && typeof error.message === "string"
      ? error.message
      : "GPT Code Apps Script request failed.";

    throw new ResponseError(upstreamFailureStatus(code, message), message, code);
  }

  return (body as AppsScriptSuccess<T>).data;
}

async function callAppsScript<T>(
  action: GptCodeAction,
  cardId = "",
): Promise<T> {
  const url = integrationUrl();
  const secret = integrationSecret();
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomUUID();
  const canonical = [action, cardId, timestamp, nonce].join("|");
  const signature = createHmac("sha256", secret)
    .update(canonical)
    .digest("hex");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, cardId, timestamp, nonce, signature }),
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    logger.error("Could not reach GPT Code Apps Script:", error);
    throw new ResponseError(502, "GPT Code Apps Script could not be reached.");
  }

  return parseResponse<T>(response);
}

export class GptCodeService {
  static async listAccounts(): Promise<GptCodeAccount[]> {
    return parseAccounts(await callAppsScript<unknown>("getAccounts"));
  }

  static async getAccount(cardId: string): Promise<GptCodeAccount> {
    const normalized = normalizeCardId(cardId);
    const account = parseAccount(
      await callAppsScript<unknown>("getAccount", normalized),
    );
    if (account.cardId !== normalized) {
      throw new ResponseError(502, "GPT Code Apps Script returned the wrong account.");
    }
    return account;
  }

  static async getCode(cardId: string): Promise<GptCodeResult> {
    const normalized = normalizeCardId(cardId);
    const result = parseCodeResult(
      await callAppsScript<unknown>("getCode", normalized),
    );
    if (result.cardId !== normalized) {
      throw new ResponseError(502, "GPT Code Apps Script returned the wrong code result.");
    }
    return result;
  }
}
