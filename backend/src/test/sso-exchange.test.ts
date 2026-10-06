import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { ssoRoute } from "../route/sso-route";
import { createSsoCode } from "../lib/sso-code-store";
import { ResponseError } from "../error/response-error";

const testApp = new Hono();
testApp.route("/sso", ssoRoute);
testApp.onError((err, c) => {
  if (err instanceof ResponseError) {
    return c.json({ errors: err.message }, err.status as 400);
  }
  throw err;
});

const originalSecret = process.env.HUB_INTERNAL_SECRET;

async function exchange(body: unknown, headers: Record<string, string> = {}) {
  return testApp.request("/sso/exchange", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /sso/exchange", () => {
  beforeEach(() => {
    process.env.HUB_INTERNAL_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.HUB_INTERNAL_SECRET = originalSecret;
  });

  it("trades a valid code for the token it was minted with", async () => {
    const code = await createSsoCode("jwt-1", "daily-checkin");

    const response = await exchange(
      { code, appId: "daily-checkin" },
      { "x-hub-internal-secret": "test-secret" },
    );
    const body = (await response.json()) as { data: { token: string } };

    expect(response.status).toBe(200);
    expect(body.data.token).toBe("jwt-1");
  });

  it("rejects without the internal secret header", async () => {
    const code = await createSsoCode("jwt-1", "daily-checkin");

    const response = await exchange({ code, appId: "daily-checkin" });

    expect(response.status).toBe(401);
  });

  it("rejects a wrong internal secret", async () => {
    const code = await createSsoCode("jwt-1", "daily-checkin");

    const response = await exchange(
      { code, appId: "daily-checkin" },
      { "x-hub-internal-secret": "wrong-secret" },
    );

    expect(response.status).toBe(401);
  });

  it("rejects a code that was already redeemed", async () => {
    const code = await createSsoCode("jwt-1", "daily-checkin");
    await exchange({ code, appId: "daily-checkin" }, { "x-hub-internal-secret": "test-secret" });

    const response = await exchange(
      { code, appId: "daily-checkin" },
      { "x-hub-internal-secret": "test-secret" },
    );

    expect(response.status).toBe(400);
  });

  it("rejects a code redeemed under a different appId than it was minted for", async () => {
    const code = await createSsoCode("jwt-1", "daily-checkin");

    const response = await exchange(
      { code, appId: "mtss-system" },
      { "x-hub-internal-secret": "test-secret" },
    );

    expect(response.status).toBe(400);
  });

  it("rejects a request missing code or appId", async () => {
    const response = await exchange(
      { appId: "daily-checkin" },
      { "x-hub-internal-secret": "test-secret" },
    );

    expect(response.status).toBe(400);
  });

  it("fails closed (503) when HUB_INTERNAL_SECRET itself isn't configured", async () => {
    delete process.env.HUB_INTERNAL_SECRET;
    const code = await createSsoCode("jwt-1", "daily-checkin");

    const response = await exchange(
      { code, appId: "daily-checkin" },
      { "x-hub-internal-secret": "anything" },
    );

    expect(response.status).toBe(503);
  });

  it("requires matching state for a state-bound code and burns failures", async () => {
    const code = await createSsoCode("jwt-1", "exima", "caller-state");
    const headers = { "x-hub-internal-secret": "test-secret" };

    expect((await exchange({ code, appId: "exima" }, headers)).status).toBe(400);
    expect(
      (await exchange({ code, appId: "exima", state: "caller-state" }, headers))
        .status,
    ).toBe(400);
  });

  it("exchanges a state-bound code when app and state both match", async () => {
    const code = await createSsoCode("jwt-1", "exima", "caller-state");
    const response = await exchange(
      { code, appId: "exima", state: "caller-state" },
      { "x-hub-internal-secret": "test-secret" },
    );
    expect(response.status).toBe(200);
  });
});
