import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { createHash, generateKeyPairSync, verify as verifyRsaSignature } from "node:crypto";
import { Hono } from "hono";
import { OidcController } from "../controller/oidc-controller";
import { ResponseError } from "../error/response-error";
import * as centralClient from "../lib/central-client";
import { oidcClients, oidcDiscovery, validateAuthorizeRequest } from "../lib/oidc-provider";
import { createSsoCode, consumeSsoCode } from "../lib/sso-code-store";
import { resetSsoRelayForTest } from "../lib/sso-relay";
import { sanitizeLaunchRedirect } from "../lib/sso-state";
import { ssoRoute } from "../route/sso-route";
import { AppsService } from "../service/apps-service";
import * as auditLogService from "../service/audit-log-service";
import type { HubUser } from "../type/central-type";
import type { HubAppResponse } from "../type/catalog-type";
import type { SessionVariables } from "../type/hono-context";

const SECRET = "s".repeat(40);
const REDIRECT = "https://guide.example.test/oidc/callback";
const CLIENTS = JSON.stringify([
  { client_id: "bookstack", client_secret: SECRET, redirect_uris: [REDIRECT], app_id: "mws-guide", name: "MWS Guide" },
]);

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const saved = {
  key: process.env.HUB_SSO_PRIVATE_KEY,
  clients: process.env.HUB_OIDC_CLIENTS,
  issuer: process.env.HUB_OIDC_ISSUER,
  origin: process.env.FRONTEND_ORIGIN,
};
function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

beforeAll(() => {
  process.env.HUB_SSO_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
  resetSsoRelayForTest();
});
afterAll(() => {
  restore("HUB_SSO_PRIVATE_KEY", saved.key);
  restore("HUB_OIDC_CLIENTS", saved.clients);
  restore("HUB_OIDC_ISSUER", saved.issuer);
  restore("FRONTEND_ORIGIN", saved.origin);
  resetSsoRelayForTest();
});
beforeEach(() => {
  process.env.HUB_OIDC_CLIENTS = CLIENTS;
  process.env.FRONTEND_ORIGIN = "https://hub.example.test";
  delete process.env.HUB_OIDC_ISSUER;
});

function employee(): HubUser {
  return {
    source: "employee",
    id: "emp-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "Test Employee",
    nick_name: null,
    email: "employee@millennia21.id",
    photo_url: null,
    unit: "MAD Lab",
    job_position: "Developer",
    job_level: "Staff",
  } as HubUser;
}

function card(overrides: Partial<HubAppResponse> = {}): HubAppResponse {
  return { id: "mws-guide", name: "MWS Guide", status: "active", access: "granted", ...overrides } as HubAppResponse;
}

function authorizeQuery(overrides: Record<string, string | null> = {}) {
  const params: Record<string, string | null> = {
    client_id: "bookstack",
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: "openid email profile",
    state: "state-123",
    nonce: "nonce-abc",
    ...overrides,
  };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== null) query.set(key, value);
  return query;
}

function decodeJwt(token: string) {
  const [header, payload, signature] = token.split(".");
  const signed = verifyRsaSignature(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    publicKey,
    Buffer.from(signature!, "base64url"),
  );
  return { signed, claims: JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) };
}

// The real routes, with the session middleware replaced by a fixed signed-in person.
const signedIn = new Hono<{ Variables: SessionVariables }>();
signedIn.use("*", async (c, next) => {
  c.set("user", employee());
  await next();
});
signedIn.get("/sso/oidc/authorize", OidcController.authorize);
signedIn.post("/sso/oidc/token", OidcController.token);
signedIn.route("/sso", ssoRoute);
signedIn.onError((err, c) => {
  if (err instanceof ResponseError) return c.json({ errors: err.message }, err.status as 400);
  throw err;
});

function token(fields: Record<string, string>, headers: Record<string, string> = {}) {
  return signedIn.request("/sso/oidc/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}

async function authorizeForCode(query = authorizeQuery()) {
  const response = await signedIn.request(`/sso/oidc/authorize?${query}`);
  expect(response.status).toBe(302);
  const location = new URL(response.headers.get("location")!);
  expect(`${location.origin}${location.pathname}`).toBe(REDIRECT);
  return location;
}

describe("client configuration", () => {
  it("parses a valid client list", () => {
    expect(oidcClients()).toEqual([
      { clientId: "bookstack", clientSecret: SECRET, redirectUris: [REDIRECT], appId: "mws-guide", name: "MWS Guide" },
    ]);
  });

  it("refuses a client without app_id, a short secret, or a non-https redirect", () => {
    const base = { client_id: "x", client_secret: SECRET, redirect_uris: [REDIRECT], app_id: "a" };
    for (const broken of [
      { ...base, app_id: "" },
      { ...base, client_secret: "short" },
      { ...base, redirect_uris: ["http://guide.example.test/cb"] },
      { ...base, redirect_uris: [] },
    ]) {
      process.env.HUB_OIDC_CLIENTS = JSON.stringify([broken]);
      expect(() => oidcClients()).toThrow();
    }
  });

  it("allows an http redirect to localhost, for a staging copy reached through a tunnel", () => {
    process.env.HUB_OIDC_CLIENTS = JSON.stringify([
      { client_id: "x", client_secret: SECRET, redirect_uris: ["http://localhost:8080/oidc/callback"], app_id: "a" },
    ]);
    expect(oidcClients()[0]!.redirectUris).toEqual(["http://localhost:8080/oidc/callback"]);
  });
});

describe("discovery", () => {
  it("derives every endpoint from the issuer", async () => {
    const response = await signedIn.request("/sso/oidc/.well-known/openid-configuration");
    const body = (await response.json()) as ReturnType<typeof oidcDiscovery>;
    expect(body.issuer).toBe("https://hub.example.test/sso/oidc");
    expect(body.authorization_endpoint).toBe("https://hub.example.test/sso/oidc/authorize");
    expect(body.token_endpoint).toBe("https://hub.example.test/sso/oidc/token");
    expect(body.jwks_uri).toBe("https://hub.example.test/.well-known/jwks.json");
    expect(body.id_token_signing_alg_values_supported).toEqual(["RS256"]);
  });

  it("uses HUB_OIDC_ISSUER without a trailing slash", () => {
    process.env.HUB_OIDC_ISSUER = "https://staging.example.test/sso/oidc/";
    expect(oidcDiscovery().issuer).toBe("https://staging.example.test/sso/oidc");
  });
});

describe("authorize request validation", () => {
  it("never redirects to an unknown client or an unregistered redirect_uri", () => {
    for (const query of [
      authorizeQuery({ client_id: "nope" }),
      authorizeQuery({ redirect_uri: "https://evil.test/cb" }),
      authorizeQuery({ redirect_uri: `${REDIRECT}?x=1` }),
    ]) {
      const result = validateAuthorizeRequest(query);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.fatal).toBe(true);
    }
  });

  it("reports protocol errors back to the registered redirect_uri", () => {
    const cases: Array<[Record<string, string | null>, string]> = [
      [{ response_type: "token" }, "unsupported_response_type"],
      [{ scope: "email" }, "invalid_scope"],
      [{ code_challenge: "a".repeat(43), code_challenge_method: "plain" }, "invalid_request"],
      [{ code_challenge: "a".repeat(43), code_challenge_method: null }, "invalid_request"],
    ];
    for (const [overrides, error] of cases) {
      const result = validateAuthorizeRequest(authorizeQuery(overrides));
      expect(result.ok || result.fatal ? null : result.error).toBe(error);
    }
  });

  it("refuses a parameter sent twice", () => {
    const query = authorizeQuery();
    query.append("redirect_uri", "https://evil.test/cb");
    const result = validateAuthorizeRequest(query);
    expect(!result.ok && result.fatal).toBe(true);
  });
});

describe("login redirect", () => {
  it("carries an authorize request through Hub's login", () => {
    const path = `/sso/oidc/authorize?${authorizeQuery()}`;
    expect(sanitizeLaunchRedirect(path)).toBe(path);
  });

  it("refuses anything but the authorize parameters", () => {
    expect(sanitizeLaunchRedirect(`/sso/oidc/authorize?${authorizeQuery()}&next=/evil`)).toBeNull();
    expect(sanitizeLaunchRedirect("/sso/oidc/token?code=x")).toBeNull();
    expect(sanitizeLaunchRedirect("https://evil.test/sso/oidc/authorize?client_id=x")).toBeNull();
  });

  it("sends a signed-out person to Hub's login and back to the same request", async () => {
    const app = new Hono();
    app.route("/sso", ssoRoute);
    const path = `/sso/oidc/authorize?${authorizeQuery()}`;
    const response = await app.request(path);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe("https://hub.example.test/login");
    expect(location.searchParams.get("redirect")).toBe(path);
  });
});

describe("authorize and token", () => {
  let audits: string[] = [];

  beforeEach(() => {
    audits = [];
    spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(employee());
    spyOn(AppsService, "listFor").mockResolvedValue([card()]);
    spyOn(auditLogService, "recordAuditLog").mockImplementation(async (input) => {
      audits.push((input.metadata as { outcome: string }).outcome);
      return null;
    });
  });
  afterEach(() => {
    (centralClient.resolveCentralIdentityById as unknown as { mockRestore(): void }).mockRestore();
    (AppsService.listFor as unknown as { mockRestore(): void }).mockRestore();
    (auditLogService.recordAuditLog as unknown as { mockRestore(): void }).mockRestore();
  });

  it("issues a code, then trades it for a signed id_token the relying party can verify", async () => {
    const location = await authorizeForCode();
    expect(location.searchParams.get("state")).toBe("state-123");
    expect(audits).toEqual(["code_issued"]);

    const response = await token({
      grant_type: "authorization_code",
      code: location.searchParams.get("code")!,
      redirect_uri: REDIRECT,
      client_id: "bookstack",
      client_secret: SECRET,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { id_token: string; token_type: string; access_token: string };
    expect(body.token_type).toBe("Bearer");
    expect(body.access_token.length).toBeGreaterThan(20);

    const { signed, claims } = decodeJwt(body.id_token);
    expect(signed).toBe(true);
    expect(claims).toMatchObject({
      iss: "https://hub.example.test/sso/oidc",
      aud: "bookstack",
      sub: "person-1",
      email: "employee@millennia21.id",
      email_verified: true,
      name: "Test Employee",
      nonce: "nonce-abc",
    });
    expect(Array.isArray(claims.groups)).toBe(true);
    expect(claims.exp - claims.iat).toBe(300);
  });

  it("accepts client_secret_basic", async () => {
    const location = await authorizeForCode();
    const basic = Buffer.from(`bookstack:${SECRET}`).toString("base64");
    const response = await token(
      { grant_type: "authorization_code", code: location.searchParams.get("code")!, redirect_uri: REDIRECT },
      { authorization: `Basic ${basic}` },
    );
    expect(response.status).toBe(200);
  });

  it("spends a code once, even when the first attempt is wrong", async () => {
    const location = await authorizeForCode();
    const code = location.searchParams.get("code")!;
    const fields = { grant_type: "authorization_code", code, client_id: "bookstack", client_secret: SECRET };

    expect((await token({ ...fields, redirect_uri: "https://evil.test/cb" })).status).toBe(400);
    const retry = await token({ ...fields, redirect_uri: REDIRECT });
    expect(retry.status).toBe(400);
    expect(((await retry.json()) as { error: string }).error).toBe("invalid_grant");
  });

  it("refuses a wrong client secret without spending the code", async () => {
    const location = await authorizeForCode();
    const code = location.searchParams.get("code")!;
    const bad = await token({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
      client_id: "bookstack",
      client_secret: "x".repeat(40),
    });
    expect(bad.status).toBe(401);
    expect(((await bad.json()) as { error: string }).error).toBe("invalid_client");

    const good = await token({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
      client_id: "bookstack",
      client_secret: SECRET,
    });
    expect(good.status).toBe(200);
  });

  it("cannot be traded at /sso/exchange, and a relay code cannot be traded here", async () => {
    const location = await authorizeForCode();
    expect(await consumeSsoCode(location.searchParams.get("code")!, "bookstack")).toBeNull();

    const relayCode = await createSsoCode("relay-jwt", "bookstack");
    const response = await token({
      grant_type: "authorization_code",
      code: relayCode,
      redirect_uri: REDIRECT,
      client_id: "bookstack",
      client_secret: SECRET,
    });
    expect(response.status).toBe(400);
  });

  it("enforces PKCE when the request carried a challenge", async () => {
    const verifier = "v".repeat(50);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const query = authorizeQuery({ code_challenge: challenge, code_challenge_method: "S256" });
    const fields = { grant_type: "authorization_code", redirect_uri: REDIRECT, client_id: "bookstack", client_secret: SECRET };

    const first = await authorizeForCode(query);
    expect((await token({ ...fields, code: first.searchParams.get("code")!, code_verifier: "w".repeat(50) })).status).toBe(400);

    const second = await authorizeForCode(query);
    expect((await token({ ...fields, code: second.searchParams.get("code")!, code_verifier: verifier })).status).toBe(200);
  });

  it("sends someone without access to the card to Hub's support page, not to the app", async () => {
    spyOn(AppsService, "listFor").mockResolvedValue([card({ access: "locked" })]);
    const response = await signedIn.request(`/sso/oidc/authorize?${authorizeQuery()}`);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/support-hub");
    expect(location.searchParams.get("error")).toBe("app_access_denied");
    expect(location.searchParams.get("app")).toBe("MWS Guide");
    expect(audits).toEqual(["access_denied"]);
  });

  it("refuses when the card is not in the person's catalog at all", async () => {
    spyOn(AppsService, "listFor").mockResolvedValue([]);
    const response = await signedIn.request(`/sso/oidc/authorize?${authorizeQuery()}`);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("app_access_denied");
  });

  it("refuses a person Central no longer lists as active", async () => {
    spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(null);
    const response = await signedIn.request(`/sso/oidc/authorize?${authorizeQuery()}`);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("account_inactive");
  });

  it("fails closed when Central cannot be reached", async () => {
    spyOn(centralClient, "resolveCentralIdentityById").mockRejectedValue(new Error("down"));
    const response = await signedIn.request(`/sso/oidc/authorize?${authorizeQuery()}`);
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("central_unavailable");
  });

  it("answers a bad client with a page, never a redirect", async () => {
    const response = await signedIn.request(`/sso/oidc/authorize?${authorizeQuery({ redirect_uri: "https://evil.test/cb" })}`);
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });
});
