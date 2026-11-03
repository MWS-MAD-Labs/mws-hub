import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  createGmailOAuthClient,
  GmailOtpClient,
  gmailOtpConfiguration,
  gptCodeProvider,
  type GmailOtpConfiguration,
} from "../service/gpt-code-gmail-service";

const ENV_NAMES = [
  "GPT_CODE_PROVIDER",
  "GPT_CODE_GMAIL_CLIENT_ID",
  "GPT_CODE_GMAIL_CLIENT_SECRET",
  "GPT_CODE_GMAIL_REFRESH_TOKEN",
  "GPT_CODE_GMAIL_MAILBOX",
  "GPT_CODE_GMAIL_FRESHNESS_MINUTES",
  "GPT_CODE_GMAIL_TIMEOUT_MS",
] as const;

const originalEnv = Object.fromEntries(
  ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof ENV_NAMES)[number], string | undefined>;

const NOW = Date.parse("2026-10-30T06:00:00.000Z");
const CONFIG: GmailOtpConfiguration = {
  clientId: "gmail-client-id",
  clientSecret: "gmail-client-secret",
  refreshToken: "gmail-refresh-token",
  mailbox: "asror@millennia21.id",
  freshnessMs: 15 * 60_000,
  timeoutMs: 15_000,
};

function restoreEnv() {
  for (const name of ENV_NAMES) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function message(options: {
  id: string;
  date?: number;
  sender?: string;
  recipient?: string;
  subject?: string;
  plain?: string;
  html?: string;
  ambiguousCode?: string;
}) {
  const parts = [];
  if (options.plain !== undefined) {
    parts.push({ mimeType: "text/plain", body: { data: base64Url(options.plain) } });
  }
  if (options.html !== undefined) {
    parts.push({ mimeType: "text/html", body: { data: base64Url(options.html) } });
  }
  if (options.ambiguousCode) {
    parts.push({ mimeType: "text/plain", body: { data: base64Url(options.ambiguousCode) } });
  }

  return {
    id: options.id,
    internalDate: String(options.date ?? NOW - 60_000),
    payload: {
      mimeType: parts.length > 1 ? "multipart/alternative" : parts[0]?.mimeType,
      headers: [
        { name: "From", value: options.sender ?? "OpenAI <noreply@openai.com>" },
        { name: "To", value: options.recipient ?? CONFIG.mailbox },
        { name: "Subject", value: options.subject ?? "Your ChatGPT verification code" },
      ],
      body: parts.length === 1 ? parts[0].body : {},
      parts: parts.length > 1 ? parts : undefined,
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientFor(
  messages: ReturnType<typeof message>[],
  options: { profile?: string; listStatus?: number } = {},
) {
  const getAccessToken = mock(async () => ({ token: "fresh-access-token" }));
  const fetcher = mock(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer fresh-access-token");
    if (url.endsWith("/users/me/profile")) {
      return json({ emailAddress: options.profile ?? CONFIG.mailbox });
    }
    if (url.includes("/users/me/messages?")) {
      if (options.listStatus) return json({ error: "not returned to caller" }, options.listStatus);
      return json({ messages: messages.map(({ id }) => ({ id })) });
    }
    const found = messages.find(({ id }) => url.includes(`/messages/${id}?`));
    return found ? json(found) : json({}, 404);
  });

  return {
    getAccessToken,
    fetcher,
    client: new GmailOtpClient(CONFIG, {
      oauthClient: { getAccessToken } as never,
      fetcher: fetcher as never,
      now: () => NOW,
    }),
  };
}

beforeEach(() => {
  process.env.GPT_CODE_PROVIDER = "gmail";
  process.env.GPT_CODE_GMAIL_CLIENT_ID = CONFIG.clientId;
  process.env.GPT_CODE_GMAIL_CLIENT_SECRET = CONFIG.clientSecret;
  process.env.GPT_CODE_GMAIL_REFRESH_TOKEN = CONFIG.refreshToken;
  process.env.GPT_CODE_GMAIL_MAILBOX = CONFIG.mailbox;
});

afterEach(() => {
  mock.restore();
  restoreEnv();
});

describe("GPT Code Gmail configuration", () => {
  it("keeps Apps Script as the default and rejects invalid providers", () => {
    delete process.env.GPT_CODE_PROVIDER;
    expect(gptCodeProvider()).toBe("apps-script");
    process.env.GPT_CODE_PROVIDER = "unknown";
    expect(() => gptCodeProvider()).toThrow();
  });

  it("fails safely when Gmail credentials are missing or the mailbox is not the test account", () => {
    delete process.env.GPT_CODE_GMAIL_REFRESH_TOKEN;
    expect(() => gmailOtpConfiguration()).toThrow();
    process.env.GPT_CODE_GMAIL_REFRESH_TOKEN = CONFIG.refreshToken;
    process.env.GPT_CODE_GMAIL_MAILBOX = "ai1@millennia21.id";
    expect(() => gmailOtpConfiguration()).toThrow();
  });

  it("creates a dedicated OAuth client with the offline refresh token", () => {
    const oauth = createGmailOAuthClient(CONFIG);
    expect(oauth.credentials.refresh_token).toBe(CONFIG.refreshToken);
    expect(oauth.credentials.scope).toBe("https://www.googleapis.com/auth/gmail.readonly");
  });
});

describe("GmailOtpClient", () => {
  it("refreshes OAuth access and retrieves a six-digit plain-text OTP", async () => {
    const setup = clientFor([message({ id: "plain", plain: "Your OpenAI login code is 123456." })]);
    await expect(setup.client.latestOtp()).resolves.toEqual({
      code: "123456",
      timestamp: "2026-10-30T05:59:00.000Z",
    });
    expect(setup.getAccessToken).toHaveBeenCalledTimes(1);
  });

  it("fails safely when the OAuth refresh cannot produce an access token", async () => {
    const client = new GmailOtpClient(CONFIG, {
      oauthClient: {
        getAccessToken: mock(async () => {
          throw new Error("refresh rejected");
        }),
      } as never,
      fetcher: mock(async () => json({})) as never,
      now: () => NOW,
    });
    await expect(client.latestOtp()).rejects.toMatchObject({
      status: 502,
      message: "GPT Code could not authenticate with Gmail.",
    });
  });

  it("decodes nested multipart HTML content", async () => {
    const setup = clientFor([message({
      id: "html",
      plain: undefined,
      html: "<html><body><p>Your ChatGPT verification code:</p><strong>654321</strong></body></html>",
    })]);
    await expect(setup.client.latestOtp()).resolves.toMatchObject({ code: "654321" });
  });

  it("selects the newest valid message using internalDate", async () => {
    const setup = clientFor([
      message({ id: "older", date: NOW - 5 * 60_000, plain: "OpenAI code 111111" }),
      message({ id: "newer", date: NOW - 30_000, plain: "OpenAI code 222222" }),
    ]);
    await expect(setup.client.latestOtp()).resolves.toMatchObject({ code: "222222" });
  });

  it("rejects invalid senders, wrong recipients, missing codes, and ambiguous messages", async () => {
    const invalidSender = clientFor([message({
      id: "spoof",
      sender: "OpenAI <attacker@example.com>",
      plain: "ChatGPT verification code 123456",
    })]);
    await expect(invalidSender.client.latestOtp()).rejects.toMatchObject({ status: 404 });

    const wrongRecipient = clientFor([message({
      id: "wrong-recipient",
      recipient: "someone-else@millennia21.id",
      plain: "ChatGPT verification code 123456",
    })]);
    await expect(wrongRecipient.client.latestOtp()).rejects.toMatchObject({ status: 404 });

    const missing = clientFor([message({ id: "missing", plain: "OpenAI login requested." })]);
    await expect(missing.client.latestOtp()).rejects.toMatchObject({ status: 404 });

    const ambiguous = clientFor([message({
      id: "ambiguous",
      plain: "OpenAI code 123456 or 654321",
    })]);
    await expect(ambiguous.client.latestOtp()).rejects.toMatchObject({ status: 404 });
  });

  it("rejects a stale OTP based on internalDate", async () => {
    const setup = clientFor([message({
      id: "stale",
      date: NOW - 16 * 60_000,
      plain: "OpenAI verification code 123456",
    })]);
    await expect(setup.client.latestOtp()).rejects.toMatchObject({
      status: 404,
      message: "The latest OpenAI verification code has expired.",
    });
  });

  it("ignores malformed messages and validates the authorized mailbox profile", async () => {
    const malformed = clientFor([{
      id: "bad",
      internalDate: "not-a-date",
      payload: null,
    } as never]);
    await expect(malformed.client.latestOtp()).rejects.toMatchObject({ status: 404 });

    const wrongMailbox = clientFor([], { profile: "someone-else@millennia21.id" });
    await expect(wrongMailbox.client.latestOtp()).rejects.toMatchObject({
      status: 503,
      code: "gpt_code_not_configured",
    });
  });

  it("converts Gmail API failures into a safe upstream error", async () => {
    const setup = clientFor([], { listStatus: 403 });
    await expect(setup.client.latestOtp()).rejects.toMatchObject({
      status: 502,
      message: "Gmail could not retrieve the verification code.",
    });
  });
});
