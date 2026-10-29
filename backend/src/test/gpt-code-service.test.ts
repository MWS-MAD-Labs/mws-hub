import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { createHmac } from "node:crypto";
import { ResponseError } from "../error/response-error";
import { GptCodeService } from "../service/gpt-code-service";

const envNames = [
  "GPT_CODE_APPS_SCRIPT_URL",
  "GPT_CODE_APPS_SCRIPT_SECRET",
  "GPT_CODE_APPS_SCRIPT_TIMEOUT_MS",
  "URL_DEPLOYMENT",
  "HUB_API_SECRET",
] as const;

const originalEnv = Object.fromEntries(
  envNames.map((name) => [name, process.env[name]]),
) as Record<(typeof envNames)[number], string | undefined>;

function restoreEnv() {
  for (const name of envNames) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function assertSignedRequest(
  input: string | URL | Request,
  init: RequestInit | undefined,
  expectedAction: string,
  expectedCardId: string,
) {
  expect(String(input)).toBe("https://script.google.com/macros/s/test/exec");
  expect(init?.method).toBe("POST");

  const body = JSON.parse(String(init?.body)) as {
    action: string;
    cardId: string;
    timestamp: number;
    nonce: string;
    signature: string;
  };
  expect(body.action).toBe(expectedAction);
  expect(body.cardId).toBe(expectedCardId);
  expect(Math.abs(Math.floor(Date.now() / 1000) - body.timestamp)).toBeLessThanOrEqual(1);
  expect(body.nonce).toMatch(/^[a-f0-9-]{36}$/);

  const canonical = [body.action, body.cardId, body.timestamp, body.nonce].join("|");
  const expectedSignature = createHmac("sha256", "test-gpt-code-secret")
    .update(canonical)
    .digest("hex");
  expect(body.signature).toBe(expectedSignature);
}

beforeEach(() => {
  process.env.GPT_CODE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/test/exec";
  process.env.GPT_CODE_APPS_SCRIPT_SECRET = "test-gpt-code-secret";
  delete process.env.URL_DEPLOYMENT;
  delete process.env.HUB_API_SECRET;
});

afterEach(() => {
  mock.restore();
  restoreEnv();
});

describe("GptCodeService", () => {
  it("signs getAccounts exactly as Code.gs expects and parses the list", async () => {
    spyOn(globalThis, "fetch").mockImplementation((async (input, init) => {
      assertSignedRequest(input, init, "getAccounts", "");
      return jsonResponse({
        ok: true,
        data: [
          { cardId: "A1", email: "ai1@millennia21.id" },
          { cardId: "A5", email: "ai5@millennia21.id" },
        ],
      });
    }) as typeof fetch);

    await expect(GptCodeService.listAccounts()).resolves.toEqual([
      { cardId: "A1", email: "ai1@millennia21.id" },
      { cardId: "A5", email: "ai5@millennia21.id" },
    ]);
  });

  it("normalizes and signs a single-account request", async () => {
    spyOn(globalThis, "fetch").mockImplementation((async (input, init) => {
      assertSignedRequest(input, init, "getAccount", "A5");
      return jsonResponse({
        ok: true,
        data: { cardId: "A5", email: "ai5@millennia21.id" },
      });
    }) as typeof fetch);

    await expect(GptCodeService.getAccount(" a5 ")).resolves.toEqual({
      cardId: "A5",
      email: "ai5@millennia21.id",
    });
  });

  it("signs a code request and validates the six-digit result", async () => {
    spyOn(globalThis, "fetch").mockImplementation((async (input, init) => {
      assertSignedRequest(input, init, "getCode", "A2");
      return jsonResponse({
        ok: true,
        data: {
          cardId: "A2",
          code: "123456",
          timestamp: "29 Oct 2026, 10:00:00",
          subject: "Your ChatGPT code",
        },
      });
    }) as typeof fetch);

    await expect(GptCodeService.getCode("A2")).resolves.toMatchObject({
      cardId: "A2",
      code: "123456",
    });
  });

  it("rejects an invalid card before contacting Apps Script", async () => {
    const fetchSpy = spyOn(globalThis, "fetch");

    await expect(GptCodeService.getAccount("A9")).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("turns Apps Script's no-code result into a Hub 404", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "No recent verification code found for ai2@millennia21.id",
      },
    }));

    try {
      await GptCodeService.getCode("A2");
      throw new Error("Expected getCode to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ResponseError);
      expect(error).toMatchObject({ status: 404 });
    }
  });

  it("fails clearly when neither the preferred nor legacy env names exist", async () => {
    delete process.env.GPT_CODE_APPS_SCRIPT_URL;
    delete process.env.GPT_CODE_APPS_SCRIPT_SECRET;
    delete process.env.URL_DEPLOYMENT;
    delete process.env.HUB_API_SECRET;

    await expect(GptCodeService.listAccounts()).rejects.toMatchObject({
      status: 503,
      code: "gpt_code_not_configured",
    });
  });

  it("supports the URL_DEPLOYMENT and HUB_API_SECRET names already used in .env", async () => {
    delete process.env.GPT_CODE_APPS_SCRIPT_URL;
    delete process.env.GPT_CODE_APPS_SCRIPT_SECRET;
    process.env.URL_DEPLOYMENT = "https://script.google.com/macros/s/test/exec";
    process.env.HUB_API_SECRET = "test-gpt-code-secret";

    spyOn(globalThis, "fetch").mockImplementation((async (input, init) => {
      assertSignedRequest(input, init, "getAccounts", "");
      return jsonResponse({ ok: true, data: [] });
    }) as typeof fetch);

    await expect(GptCodeService.listAccounts()).resolves.toEqual([]);
  });
});
