import { OAuth2Client } from "google-auth-library";
import { ResponseError } from "../error/response-error";
import { logger } from "../lib/logger";

const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const TEST_MAILBOX = "asror@millennia21.id";
const DEFAULT_FRESHNESS_MINUTES = 15;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_CANDIDATES = 20;

export type GptCodeProvider = "apps-script" | "gmail";

export type GmailOtpConfiguration = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  mailbox: string;
  freshnessMs: number;
  timeoutMs: number;
};

export type GmailOtpResult = {
  code: string;
  timestamp: string;
};

type GmailHeader = {
  name?: unknown;
  value?: unknown;
};

type GmailMessagePart = {
  mimeType?: unknown;
  headers?: unknown;
  body?: { data?: unknown } | null;
  parts?: unknown;
};

type GmailMessage = {
  id?: unknown;
  internalDate?: unknown;
  payload?: unknown;
};

type GmailMessageList = {
  messages?: unknown;
};

type GmailProfile = {
  emailAddress?: unknown;
};

type AccessTokenClient = Pick<OAuth2Client, "getAccessToken">;

export function gptCodeProvider(): GptCodeProvider {
  const provider = (process.env.GPT_CODE_PROVIDER || "apps-script")
    .trim()
    .toLowerCase();
  if (provider === "apps-script" || provider === "gmail") return provider;
  throw new ResponseError(
    503,
    "GPT Code provider configuration is invalid.",
    "gpt_code_not_configured",
  );
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  throw new ResponseError(
    503,
    "GPT Code Gmail is not configured.",
    "gpt_code_not_configured",
  );
}

function positiveNumber(raw: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

export function gmailOtpConfiguration(): GmailOtpConfiguration {
  const mailbox = required("GPT_CODE_GMAIL_MAILBOX").toLowerCase();
  if (mailbox !== TEST_MAILBOX) {
    throw new ResponseError(
      503,
      `This testing phase only supports ${TEST_MAILBOX}.`,
      "gpt_code_not_configured",
    );
  }

  return {
    clientId: required("GPT_CODE_GMAIL_CLIENT_ID"),
    clientSecret: required("GPT_CODE_GMAIL_CLIENT_SECRET"),
    refreshToken: required("GPT_CODE_GMAIL_REFRESH_TOKEN"),
    mailbox,
    freshnessMs: positiveNumber(
      process.env.GPT_CODE_GMAIL_FRESHNESS_MINUTES,
      DEFAULT_FRESHNESS_MINUTES,
      60,
    ) * 60_000,
    timeoutMs: positiveNumber(
      process.env.GPT_CODE_GMAIL_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      30_000,
    ),
  };
}

export function createGmailOAuthClient(config: GmailOtpConfiguration) {
  const client = new OAuth2Client(config.clientId, config.clientSecret);
  client.setCredentials({ refresh_token: config.refreshToken, scope: GMAIL_READONLY_SCOPE });
  return client;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function messagePart(value: unknown): GmailMessagePart | null {
  return isRecord(value) ? value as GmailMessagePart : null;
}

function headers(part: GmailMessagePart): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!Array.isArray(part.headers)) return result;

  for (const raw of part.headers as GmailHeader[]) {
    if (!isRecord(raw) || typeof raw.name !== "string" || typeof raw.value !== "string") {
      continue;
    }
    const name = raw.name.toLowerCase();
    result.set(name, [...(result.get(name) ?? []), raw.value]);
  }
  return result;
}

function decodeBase64Url(value: string): string {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function collectMimeText(part: GmailMessagePart): { plain: string[]; html: string[] } {
  const result = { plain: [] as string[], html: [] as string[] };
  const mimeType = typeof part.mimeType === "string" ? part.mimeType.toLowerCase() : "";
  const data = isRecord(part.body) && typeof part.body.data === "string"
    ? decodeBase64Url(part.body.data)
    : "";

  if (data && mimeType === "text/plain") result.plain.push(data);
  if (data && mimeType === "text/html") result.html.push(data);

  if (Array.isArray(part.parts)) {
    for (const child of part.parts) {
      const parsed = messagePart(child);
      if (!parsed) continue;
      const nested = collectMimeText(parsed);
      result.plain.push(...nested.plain);
      result.html.push(...nested.html);
    }
  }

  return result;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function emailAddresses(values: string[]): string[] {
  return values
    .flatMap((value) => value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
    .map((address) => address.toLowerCase());
}

function senderIsOpenAi(values: string[]): boolean {
  return emailAddresses(values).some((address) => {
    const domain = address.split("@")[1];
    return domain === "openai.com" || domain.endsWith(".openai.com");
  });
}

function recipientMatches(headerMap: Map<string, string[]>, mailbox: string): boolean {
  const values = ["to", "cc", "delivered-to", "x-original-to"]
    .flatMap((name) => headerMap.get(name) ?? []);
  return emailAddresses(values).includes(mailbox);
}

function hasOtpContext(subject: string, text: string): boolean {
  const content = `${subject}\n${text}`;
  return /\b(?:openai|chatgpt)\b/i.test(content) &&
    /\b(?:verification|verify|login|sign[ -]?in|code)\b/i.test(content);
}

function extractOtp(text: string): string | null {
  const unique = new Set(text.match(/(?<!\d)\d{6}(?!\d)/g) ?? []);
  if (unique.size !== 1) return null;
  return [...unique][0];
}

function candidateFromMessage(message: GmailMessage, mailbox: string) {
  if (typeof message.internalDate !== "string") return null;
  const internalDate = Number(message.internalDate);
  if (!Number.isFinite(internalDate) || internalDate <= 0) return null;

  const payload = messagePart(message.payload);
  if (!payload) return null;
  const headerMap = headers(payload);
  if (!senderIsOpenAi(headerMap.get("from") ?? [])) return null;
  if (!recipientMatches(headerMap, mailbox)) return null;

  const mime = collectMimeText(payload);
  const body = [...mime.plain, ...mime.html.map(htmlToText)].join("\n");
  const subject = (headerMap.get("subject") ?? []).join(" ");
  if (!hasOtpContext(subject, body)) return null;

  const code = extractOtp(`${subject}\n${body}`);
  if (!code) return null;
  return { code, internalDate };
}

export class GmailOtpClient {
  private readonly oauthClient: AccessTokenClient;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;

  constructor(
    private readonly config: GmailOtpConfiguration,
    dependencies: {
      oauthClient?: AccessTokenClient;
      fetcher?: typeof fetch;
      now?: () => number;
    } = {},
  ) {
    this.oauthClient = dependencies.oauthClient ?? createGmailOAuthClient(config);
    this.fetcher = dependencies.fetcher ?? fetch;
    this.now = dependencies.now ?? Date.now;
  }

  private async accessToken(): Promise<string> {
    try {
      const result = await this.oauthClient.getAccessToken();
      const token = typeof result === "string" ? result : result?.token;
      if (!token) throw new Error("missing access token");
      return token;
    } catch (error) {
      logger.error("GPT Code Gmail OAuth refresh failed:", error instanceof Error ? error.name : "unknown");
      throw new ResponseError(502, "GPT Code could not authenticate with Gmail.");
    }
  }

  private async request<T>(path: string, token: string): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${GMAIL_API_BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      logger.error("GPT Code Gmail request failed:", error instanceof Error ? error.name : "unknown");
      throw new ResponseError(502, "GPT Code could not reach Gmail.");
    }

    if (!response.ok) {
      logger.error("GPT Code Gmail API returned status:", response.status);
      throw new ResponseError(502, "Gmail could not retrieve the verification code.");
    }

    try {
      return await response.json() as T;
    } catch {
      throw new ResponseError(502, "Gmail returned an invalid response.");
    }
  }

  async latestOtp(): Promise<GmailOtpResult> {
    const token = await this.accessToken();
    const profile = await this.request<GmailProfile>("/users/me/profile", token);
    if (
      typeof profile.emailAddress !== "string" ||
      profile.emailAddress.toLowerCase() !== this.config.mailbox
    ) {
      throw new ResponseError(
        503,
        "The Gmail authorization does not match the configured GPT Code mailbox.",
        "gpt_code_not_configured",
      );
    }

    const query = encodeURIComponent("newer_than:1d {from:openai.com from:tm.openai.com}");
    const list = await this.request<GmailMessageList>(
      `/users/me/messages?maxResults=${MAX_CANDIDATES}&q=${query}`,
      token,
    );
    const ids = Array.isArray(list.messages)
      ? list.messages.flatMap((item) =>
        isRecord(item) && typeof item.id === "string" ? [item.id] : [],
      )
      : [];

    const messages = await Promise.all(ids.map((id) =>
      this.request<GmailMessage>(
        `/users/me/messages/${encodeURIComponent(id)}?format=full`,
        token,
      ),
    ));
    const candidates = messages
      .map((message) => candidateFromMessage(message, this.config.mailbox))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((left, right) => right.internalDate - left.internalDate);

    const newest = candidates[0];
    if (!newest) {
      throw new ResponseError(404, "No valid OpenAI verification code was found.");
    }
    if (this.now() - newest.internalDate > this.config.freshnessMs) {
      throw new ResponseError(404, "The latest OpenAI verification code has expired.");
    }

    return {
      code: newest.code,
      timestamp: new Date(newest.internalDate).toISOString(),
    };
  }
}

export class GptCodeGmailService {
  static account() {
    const config = gmailOtpConfiguration();
    return { cardId: "GMAIL_TEST", email: config.mailbox };
  }

  static async getCode(): Promise<GmailOtpResult> {
    const config = gmailOtpConfiguration();
    return new GmailOtpClient(config).latestOtp();
  }
}
