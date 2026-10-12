import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { AppsService } from "../service/apps-service";
import { acceptsInternalSecret, deriveAppSecret, secretVersion } from "../lib/hub-app-secret";
import { ssoRoute } from "../route/sso-route";
import { createSsoCode } from "../lib/sso-code-store";
import { ResponseError } from "../error/response-error";

const MASTER = "0123456789abcdef0123456789abcdef";

afterEach(() => {
  mock.restore();
});

describe("secret of one application", () => {
  // The same vector Central tests against, so both make the same secret.
  it("is made the way Central makes it", () => {
    expect(deriveAppSecret(MASTER, "exima", 1)).toBe("v1.c25303f7dc302ea96af146bccb096b61b0ea6705ba67ec29d08e975935779a15");
    expect(secretVersion("v12." + "a".repeat(64))).toBe(12);
    expect(secretVersion(MASTER)).toBeNull();
  });
});

describe("which internal secrets the Hub accepts", () => {
  const original = process.env.HUB_ALLOW_SHARED_SECRET;
  beforeEach(() => {
    delete process.env.HUB_ALLOW_SHARED_SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.HUB_ALLOW_SHARED_SECRET;
    else process.env.HUB_ALLOW_SHARED_SECRET = original;
  });
  const catalog = (version: number | null) =>
    spyOn(AppsService, "findByLaunchId").mockResolvedValue(
      version === null ? null : ({ id: "exima", hubSecret: { mode: "own", version } } as never),
    );

  it("takes the master while it is allowed, and not once it is switched off", async () => {
    expect(await acceptsInternalSecret(MASTER, MASTER, "exima")).toBe(true);
    process.env.HUB_ALLOW_SHARED_SECRET = "false";
    expect(await acceptsInternalSecret(MASTER, MASTER, "exima")).toBe(false);
  });

  it("takes the secret made for that application only", async () => {
    catalog(1);
    process.env.HUB_ALLOW_SHARED_SECRET = "false";
    const secret = deriveAppSecret(MASTER, "exima", 1);
    expect(await acceptsInternalSecret(secret, MASTER, "exima")).toBe(true);
    // One application's secret does not open the door as another, or without saying who it is.
    expect(await acceptsInternalSecret(secret, MASTER, "daily-checkin")).toBe(false);
    expect(await acceptsInternalSecret(secret, MASTER, null)).toBe(false);
    expect(await acceptsInternalSecret(deriveAppSecret("another-master-0123456789abcdef", "exima", 1), MASTER, "exima")).toBe(false);
    expect(await acceptsInternalSecret("", MASTER, "exima")).toBe(false);
  });

  it("refuses an old version after a rotation, and takes the new one", async () => {
    catalog(2);
    expect(await acceptsInternalSecret(deriveAppSecret(MASTER, "exima", 1), MASTER, "exima")).toBe(false);
    expect(await acceptsInternalSecret(deriveAppSecret(MASTER, "exima", 2), MASTER, "exima")).toBe(true);
  });

  it("still checks when the catalog does not know the application", async () => {
    catalog(null);
    expect(await acceptsInternalSecret(deriveAppSecret(MASTER, "exima", 1), MASTER, "exima")).toBe(true);
  });
});

describe("POST /sso/exchange with a secret of the application's own", () => {
  const app = new Hono();
  app.route("/sso", ssoRoute);
  app.onError((err, c) => (err instanceof ResponseError ? c.json({ errors: err.message }, err.status as 400) : (() => { throw err; })()));
  const original = process.env.HUB_INTERNAL_SECRET;
  beforeEach(() => {
    process.env.HUB_INTERNAL_SECRET = MASTER;
  });
  afterEach(() => {
    process.env.HUB_INTERNAL_SECRET = original;
  });

  it("lets the application trade its code, and not as another", async () => {
    spyOn(AppsService, "findByLaunchId").mockResolvedValue({ id: "exima", hubSecret: { mode: "own", version: 1 } } as never);
    const send = (appId: string, secret: string, code: string) =>
      app.request("/sso/exchange", {
        method: "POST",
        headers: { "content-type": "application/json", "x-hub-internal-secret": secret },
        body: JSON.stringify({ code, appId }),
      });
    const code = await createSsoCode("relay-token", "exima");
    expect((await send("exima", deriveAppSecret(MASTER, "exima", 1), code)).status).toBe(200);
    const other = await createSsoCode("relay-token", "daily-checkin");
    expect((await send("daily-checkin", deriveAppSecret(MASTER, "exima", 1), other)).status).toBe(401);
  });
});

describe("POST /sso/secret-check", () => {
  const app = new Hono();
  app.route("/sso", ssoRoute);
  app.onError((err, c) => (err instanceof ResponseError ? c.json({ errors: err.message }, err.status as 400) : (() => { throw err; })()));
  const original = process.env.HUB_INTERNAL_SECRET;
  afterEach(() => {
    process.env.HUB_INTERNAL_SECRET = original;
  });
  const send = (secret?: string) =>
    app.request("/sso/secret-check", { method: "POST", headers: secret === undefined ? {} : { "x-hub-internal-secret": secret } });

  it("says yes only to the master secret", async () => {
    process.env.HUB_INTERNAL_SECRET = MASTER;
    expect((await send(MASTER)).status).toBe(200);
    expect((await send("wrong-secret-value-123456")).status).toBe(401);
    expect((await send(deriveAppSecret(MASTER, "exima", 1))).status).toBe(401);
    expect((await send()).status).toBe(401);
  });

  it("is unavailable while the Hub has no secret", async () => {
    delete process.env.HUB_INTERNAL_SECRET;
    expect((await send(MASTER)).status).toBe(503);
  });
});
