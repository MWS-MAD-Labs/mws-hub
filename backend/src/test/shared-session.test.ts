import { beforeEach, describe, expect, it } from "bun:test";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { hubSsoJwks } from "../lib/sso-relay";
import { Hono } from "hono";
import {
  endSharedSession,
  handleRefresh,
  handleRestore,
  issueSharedSession,
  startFamily,
  useRefreshStoreForTest,
  type RefreshDeps,
  type RefreshStore,
} from "../lib/shared-session";

// The Hub's signing key. Other test files may have loaded one already, so this only supplies one when none is set,
// and the tokens are checked against the Hub's own published keys.
if (!process.env.HUB_SSO_PRIVATE_KEY) {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.HUB_SSO_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}
delete process.env.HUB_COOKIE_DOMAIN;

type Row = {
  id: string;
  family_id: string;
  token_hash: string;
  central_id: string;
  source: string;
  session_version: number;
  family_expires_at: Date;
  rotated_at: Date | null;
  revoked_at: Date | null;
};
const rows: Row[] = [];
let nextId = 1;

// The refresh tokens live in this array instead of the database.
const fakeStore: RefreshStore = {
  create: async (data) => {
    rows.push({ id: `r${nextId++}`, rotated_at: null, revoked_at: null, ...(data as Omit<Row, "id" | "rotated_at" | "revoked_at">) });
  },
  findByHash: async (hash) => rows.find((row) => row.token_hash === hash) ?? null,
  claimRotation: async (id) => {
    const row = rows.find((entry) => entry.id === id);
    if (!row || row.rotated_at) return false;
    row.rotated_at = new Date();
    return true;
  },
  revokeFamily: async (familyId) => {
    rows.filter((row) => row.family_id === familyId && !row.revoked_at).forEach((row) => (row.revoked_at = new Date()));
  },
};

const sessions = new Map<string, number>();
let identity: unknown = null;
let centralDown = false;
let hubSignedIn: unknown = null;
const deps: RefreshDeps = {
  sessionVersionOf: async (id) => sessions.get(id) ?? null,
  resolveIdentity: async () => {
    if (centralDown) throw new Error("central is down");
    return identity as never;
  },
  tagsFor: () => [],
  currentHubUser: async () => hubSignedIn as never,
};

const person = {
  source: "employee",
  id: "employee-1",
  person_id: "person-1",
  employee_id: "E1",
  full_name: "Test Person",
  nick_name: null,
  email: "person@example.com",
  photo_url: null,
  unit: null,
  job_position: null,
  job_level: null,
  status: "ACTIVE",
  employment_type: null,
};

const app = new Hono();
app.post("/auth/refresh", (c) => handleRefresh(c, deps));
app.get("/auth/restore", (c) => handleRestore(c, deps, "http://hub.test/"));
app.post("/auth/logout", async (c) => {
  await endSharedSession(c);
  return c.json({ ok: true });
});
app.post("/login", async (c) => {
  await issueSharedSession(c, person as never, [], sessions.get("employee-1") ?? 0);
  return c.json({ ok: true });
});

const ORIGIN = "http://localhost:5174";
const call = (path: string, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(path, {
    method: "POST",
    headers: { origin: ORIGIN, "x-requested-with": "mws", ...(cookie ? { cookie } : {}), ...headers },
  });
const cookieValue = (response: Response, name: string) =>
  response.headers.getSetCookie().find((line) => line.startsWith(`${name}=`))?.split(";")[0].slice(name.length + 1) ?? null;

function claimsOf(token: string) {
  const [head, body, signature] = token.split(".");
  const jwk = hubSsoJwks().keys[0];
  const ok = verify(
    "RSA-SHA256",
    Buffer.from(`${head}.${body}`),
    createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: "jwk" }),
    Buffer.from(signature, "base64url"),
  );
  return { ok, claims: JSON.parse(Buffer.from(body, "base64url").toString()) };
}

const signedIn = () => startFamily(person, sessions.get("employee-1") ?? 0);

describe("shared session", () => {
  beforeEach(() => {
    useRefreshStoreForTest(fakeStore);
    rows.length = 0;
    sessions.clear();
    sessions.set("employee-1", 3);
    identity = person;
    centralDown = false;
    hubSignedIn = null;
  });

  it("signs in with an access token and a refresh token", async () => {
    const response = await app.request("/login", { method: "POST" });
    const access = cookieValue(response, "hub_at");
    expect(access).toBeTruthy();
    expect(cookieValue(response, "hub_rt")).toBeTruthy();
    const { ok, claims } = claimsOf(access!);
    expect(ok).toBe(true);
    expect(claims).toMatchObject({ iss: "mws-hub", aud: "mws-apps", sub: "person-1", email: "person@example.com" });
    expect(claims.exp - claims.iat).toBe(300);
    expect(rows).toHaveLength(1);
    expect(rows[0].session_version).toBe(3);
  });

  it("gives a new access token and turns the refresh token over", async () => {
    const { token } = await signedIn();
    const response = await call("/auth/refresh", `hub_rt=${token}`);
    expect(response.status).toBe(200);
    expect(claimsOf(cookieValue(response, "hub_at")!).ok).toBe(true);
    const next = cookieValue(response, "hub_rt");
    expect(next).toBeTruthy();
    expect(next).not.toBe(token);
    expect(rows.filter((row) => row.rotated_at)).toHaveLength(1);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("refuses a page that is not on the allowed origins, and a call without the marker header", async () => {
    const { token } = await signedIn();
    expect((await call("/auth/refresh", `hub_rt=${token}`, { origin: "https://evil.example" })).status).toBe(403);
    const noMarker = await app.request("/auth/refresh", { method: "POST", headers: { origin: ORIGIN, cookie: `hub_rt=${token}` } });
    expect(noMarker.status).toBe(403);
    expect(rows.some((row) => row.rotated_at)).toBe(false);
  });

  it("lets a second tab refresh with the same token right after, without a new refresh token", async () => {
    const { token } = await signedIn();
    await call("/auth/refresh", `hub_rt=${token}`);
    const second = await call("/auth/refresh", `hub_rt=${token}`);
    expect(second.status).toBe(200);
    expect(cookieValue(second, "hub_at")).toBeTruthy();
    expect(cookieValue(second, "hub_rt")).toBeNull();
    expect(rows).toHaveLength(2);
  });

  it("revokes the whole family when an old token is shown again later", async () => {
    const { token } = await signedIn();
    await call("/auth/refresh", `hub_rt=${token}`);
    rows[0].rotated_at = new Date(Date.now() - 60_000);
    const replay = await call("/auth/refresh", `hub_rt=${token}`);
    expect(replay.status).toBe(401);
    expect(rows.every((row) => row.revoked_at)).toBe(true);
    const cleared = replay.headers.getSetCookie().join(" ");
    expect(cleared).toContain("hub_at=");
    expect(cleared).toContain("hub_rt=");
  });

  it("ends the session when a newer sign-in elsewhere replaced it", async () => {
    const { token } = await signedIn();
    sessions.set("employee-1", 4);
    expect((await call("/auth/refresh", `hub_rt=${token}`)).status).toBe(401);
    expect(rows.every((row) => row.revoked_at)).toBe(true);
  });

  it("ends the session when Central no longer lists the person as active", async () => {
    const { token } = await signedIn();
    identity = null;
    expect((await call("/auth/refresh", `hub_rt=${token}`)).status).toBe(401);
    expect(rows.every((row) => row.revoked_at)).toBe(true);
  });

  it("keeps the token usable when Central cannot be reached", async () => {
    const { token } = await signedIn();
    centralDown = true;
    expect((await call("/auth/refresh", `hub_rt=${token}`)).status).toBe(503);
    expect(rows[0].rotated_at).toBeNull();
    expect(rows[0].revoked_at).toBeNull();
  });

  it("rejects a missing or unknown refresh token", async () => {
    expect((await call("/auth/refresh")).status).toBe(401);
    expect((await call("/auth/refresh", "hub_rt=unknown")).status).toBe(401);
  });

  it("signs out of every app when the Hub logs out: the family is revoked and both cookies go", async () => {
    const { token } = await signedIn();
    const response = await call("/auth/logout", `hub_rt=${token}; hub_session=whatever`);
    expect(response.status).toBe(200);
    expect(rows.every((row) => row.revoked_at)).toBe(true);
    const cleared = response.headers.getSetCookie().join(" ");
    expect(cleared).toContain("hub_at=");
    expect(cleared).toContain("hub_rt=");
  });

  describe("restore", () => {
    const restore = (returnUrl: string | null, cookie?: string) =>
      app.request(`/auth/restore${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ""}`, {
        headers: cookie ? { cookie } : {},
      });

    it("sends a person with a valid refresh token back to the app, signed in", async () => {
      const { token } = await signedIn();
      const response = await restore("http://localhost:5174/some/page?x=1", `hub_rt=${token}`);
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("http://localhost:5174/some/page?x=1&restored=1");
      expect(claimsOf(cookieValue(response, "hub_at")!).ok).toBe(true);
      expect(cookieValue(response, "hub_rt")).toBeTruthy();
    });

    it("starts the shared session from the Hub's own sign-in when there is no refresh token yet", async () => {
      hubSignedIn = person;
      const response = await restore("http://localhost:5174/", undefined);
      expect(response.headers.get("location")).toBe("http://localhost:5174/?restored=1");
      expect(claimsOf(cookieValue(response, "hub_at")!).ok).toBe(true);
      expect(cookieValue(response, "hub_rt")).toBeTruthy();
      expect(rows).toHaveLength(1);
      expect(rows[0].session_version).toBe(3);
    });

    it("sends a person without a session to the Hub front page", async () => {
      const response = await restore("http://localhost:5174/", "hub_rt=unknown");
      expect(response.headers.get("location")).toBe("http://hub.test/");
      expect(cookieValue(response, "hub_at")).toBe("");
    });

    it("never sends anyone to an address outside the parent domain", async () => {
      const { token } = await signedIn();
      const response = await restore("https://evil.example/steal", `hub_rt=${token}`);
      expect(response.headers.get("location")).toBe("http://hub.test/");
      expect(rows.some((row) => row.rotated_at)).toBe(false);
    });

    it("sends a request with no return address to the Hub front page", async () => {
      const response = await restore(null);
      expect(response.headers.get("location")).toBe("http://hub.test/");
    });
  });
});

describe("usesSharedSession", () => {
  it("is off until apps are listed, matches by id, and * means all", async () => {
    const { usesSharedSession } = await import("../lib/shared-session");
    const before = process.env.HUB_SHARED_SESSION_APPS;
    try {
      delete process.env.HUB_SHARED_SESSION_APPS;
      expect(usesSharedSession("exima")).toBe(false);
      process.env.HUB_SHARED_SESSION_APPS = " exima , daily-checkin ";
      expect(usesSharedSession("exima")).toBe(true);
      expect(usesSharedSession(undefined, "daily-checkin")).toBe(true);
      expect(usesSharedSession("mtss")).toBe(false);
      process.env.HUB_SHARED_SESSION_APPS = "*";
      expect(usesSharedSession("mtss")).toBe(true);
    } finally {
      if (before === undefined) delete process.env.HUB_SHARED_SESSION_APPS;
      else process.env.HUB_SHARED_SESSION_APPS = before;
    }
  });
});

describe("entryUsesSharedSession", () => {
  it("follows Central's setting, and the env list for an older Central", async () => {
    const { entryUsesSharedSession } = await import("../lib/shared-session");
    const before = process.env.HUB_SHARED_SESSION_APPS;
    try {
      delete process.env.HUB_SHARED_SESSION_APPS;
      expect(entryUsesSharedSession({ id: "a", sessionMode: "shared" })).toBe(true);
      expect(entryUsesSharedSession({ id: "a", sessionMode: "relay" })).toBe(false);
      expect(entryUsesSharedSession({ id: "a" })).toBe(false);
      process.env.HUB_SHARED_SESSION_APPS = "a";
      expect(entryUsesSharedSession({ id: "a" })).toBe(true);
    } finally {
      if (before === undefined) delete process.env.HUB_SHARED_SESSION_APPS;
      else process.env.HUB_SHARED_SESSION_APPS = before;
    }
  });
});
