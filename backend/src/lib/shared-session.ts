import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { HubUser } from "../type/central-type";
import type { HubAccessSource } from "../type/catalog-type";
import { prisma } from "./prisma";
import { signHubJwt } from "./sso-relay";

// The session every app shares, made of two cookies:
//  - the access token (hub_at): a short RS256 token on the parent domain, so every app can read it and check it
//    against the Hub's keys. It says who the person is and nothing more.
//  - the refresh token (hub_rt): an opaque value that stays on the Hub's own host. Only the Hub can use it to
//    get a new access token, and it turns over on every use.
// Logging out of the Hub deletes both, which signs the person out of every app at once.

const ISSUER = "mws-hub";
const GRACE_SECONDS = 10;

function numberFrom(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return raw !== undefined && raw !== "" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export const accessCookieName = () => process.env.HUB_ACCESS_COOKIE_NAME || "hub_at";
export const refreshCookieName = () => process.env.HUB_REFRESH_COOKIE_NAME || "hub_rt";
export const accessAudience = () => process.env.HUB_ACCESS_AUDIENCE || "mws-apps";
export const accessTtlSeconds = () => numberFrom(process.env.HUB_ACCESS_TTL_SECONDS, 300);
const refreshTtlSeconds = () => numberFrom(process.env.HUB_REFRESH_TTL_SECONDS, 8 * 60 * 60);
// Empty on localhost, where cookies are shared between ports anyway.
const cookieDomain = () => process.env.HUB_COOKIE_DOMAIN?.trim().replace(/^\./, "") || undefined;
const refreshCookiePath = () => process.env.HUB_REFRESH_COOKIE_PATH || "/auth";
const secure = () => process.env.NODE_ENV === "production";

const accessCookieOptions = () => ({
  httpOnly: true,
  secure: secure(),
  sameSite: "Lax" as const,
  path: "/",
  ...(cookieDomain() ? { domain: cookieDomain() } : {}),
});

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: secure(),
  sameSite: "Strict" as const,
  path: refreshCookiePath(),
});

// An origin that may call /auth/refresh with the cookies: any page on the parent domain over https, or
// localhost while no parent domain is configured (development).
export function refreshOriginAllowed(origin: string | undefined): origin is string {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const domain = cookieDomain();
  if (domain) return url.protocol === "https:" && (url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

// Where the refresh tokens live. The database in the app; tests hand in their own.
export interface RefreshStore {
  create(row: NewTokenRow & { token_hash: string }): Promise<unknown>;
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  claimRotation(id: string): Promise<boolean>;
  revokeFamily(familyId: string): Promise<void>;
}

const databaseStore: RefreshStore = {
  create: (row) => prisma.refreshToken.create({ data: row }),
  findByHash: (tokenHash) => prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } }) as Promise<StoredRefreshToken | null>,
  claimRotation: async (id) => {
    const claimed = await prisma.refreshToken.updateMany({ where: { id, rotated_at: null }, data: { rotated_at: new Date() } });
    return claimed.count === 1;
  },
  revokeFamily: async (familyId) => {
    await prisma.refreshToken.updateMany({ where: { family_id: familyId, revoked_at: null }, data: { revoked_at: new Date() } });
  },
};

let store: RefreshStore = databaseStore;
export function useRefreshStoreForTest(replacement: RefreshStore | null) {
  store = replacement ?? databaseStore;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export async function signAccessToken(
  person: { id: string; email: string; source: string },
  tags: HubAccessSource[],
  familyId: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signHubJwt({
    iss: ISSUER,
    aud: accessAudience(),
    sub: person.id,
    email: person.email,
    source: person.source,
    tags,
    sid: familyId,
    jti: randomUUID(),
    iat: now,
    exp: now + accessTtlSeconds(),
  });
}

export type StoredRefreshToken = {
  id: string;
  family_id: string;
  central_id: string;
  source: string;
  session_version: number;
  family_expires_at: Date;
  rotated_at: Date | null;
  revoked_at: Date | null;
};

type NewTokenRow = {
  family_id: string;
  central_id: string;
  source: string;
  session_version: number;
  family_expires_at: Date;
};

async function createToken(row: NewTokenRow): Promise<string> {
  const token = newToken();
  await store.create({ ...row, token_hash: hashToken(token) });
  return token;
}

// `sessionVersion` is the person's UserSession.session_version now: a newer sign-in elsewhere ends this family.
export async function startFamily(person: { id: string; source: string }, sessionVersion: number): Promise<{
  token: string;
  familyId: string;
  expiresAt: Date;
}> {
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);
  const token = await createToken({
    family_id: familyId,
    central_id: person.id,
    source: person.source,
    session_version: sessionVersion,
    family_expires_at: expiresAt,
  });
  return { token, familyId, expiresAt };
}

export type TokenCheck =
  | { status: "ok"; row: StoredRefreshToken }
  // Rotated a moment ago by another tab: give a new access token, keep the refresh token the other tab got.
  | { status: "grace"; row: StoredRefreshToken }
  // Rotated earlier and shown again: a copy was taken. The whole family is revoked.
  | { status: "reuse"; row: StoredRefreshToken }
  | { status: "invalid" };

export async function checkRefreshToken(token: string): Promise<TokenCheck> {
  const row = await store.findByHash(hashToken(token));
  if (!row) return { status: "invalid" };
  if (row.revoked_at || row.family_expires_at.getTime() <= Date.now()) return { status: "invalid" };
  if (!row.rotated_at) return { status: "ok", row };
  if (Date.now() - row.rotated_at.getTime() <= GRACE_SECONDS * 1000) return { status: "grace", row };
  await revokeFamily(row.family_id);
  return { status: "reuse", row };
}

// Turns the token over. Returns the new token, or null when another request got there first.
export async function rotateRefreshToken(row: StoredRefreshToken): Promise<string | null> {
  if (!(await store.claimRotation(row.id))) return null;
  return createToken({
    family_id: row.family_id,
    central_id: row.central_id,
    source: row.source,
    session_version: row.session_version,
    family_expires_at: row.family_expires_at,
  });
}

export async function revokeFamily(familyId: string): Promise<void> {
  await store.revokeFamily(familyId);
}

export function setSharedCookies(
  c: Context,
  tokens: { access: string; refresh?: string; familyExpiresAt: Date },
): void {
  setCookie(c, accessCookieName(), tokens.access, { ...accessCookieOptions(), maxAge: accessTtlSeconds() });
  if (tokens.refresh) {
    const remaining = Math.max(Math.floor((tokens.familyExpiresAt.getTime() - Date.now()) / 1000), 1);
    setCookie(c, refreshCookieName(), tokens.refresh, { ...refreshCookieOptions(), maxAge: remaining });
  }
}

export function clearSharedCookies(c: Context): void {
  deleteCookie(c, accessCookieName(), accessCookieOptions());
  deleteCookie(c, refreshCookieName(), refreshCookieOptions());
}

// At sign-in: a new family and both cookies.
export async function issueSharedSession(
  c: Context,
  user: HubUser,
  tags: HubAccessSource[],
  sessionVersion: number,
): Promise<void> {
  const family = await startFamily(user, sessionVersion);
  const access = await signAccessToken(user, tags, family.familyId);
  setSharedCookies(c, { access, refresh: family.token, familyExpiresAt: family.expiresAt });
}

// At sign-out from the Hub: the family is revoked and both cookies go.
export async function endSharedSession(c: Context): Promise<void> {
  const token = getCookie(c, refreshCookieName());
  if (token) {
    const row = await store.findByHash(hashToken(token));
    if (row) await revokeFamily(row.family_id);
  }
  clearSharedCookies(c);
}

export interface RefreshDeps {
  // UserSession.session_version of the person, or null when there is none.
  sessionVersionOf(centralId: string): Promise<number | null>;
  // The person as Central knows them now. null: not active any more. A thrown error: Central could not be reached.
  resolveIdentity(centralId: string, source: "employee" | "student"): Promise<HubUser | null>;
  tagsFor(user: HubUser): HubAccessSource[];
}

// Gives the person a new access token and turns the refresh token over. Called from the apps' pages, with the
// cookies, shortly before the access token ends.
export async function handleRefresh(c: Context, deps: RefreshDeps): Promise<Response> {
  const fail = (status: 401 | 403 | 503, message: string) => {
    if (status === 401) clearSharedCookies(c);
    return c.json({ errors: message }, status);
  };
  if (!refreshOriginAllowed(c.req.header("origin")) || !c.req.header("x-requested-with")) {
    return fail(403, "Origin not allowed.");
  }
  const token = getCookie(c, refreshCookieName());
  if (!token) return fail(401, "No session.");

  const check = await checkRefreshToken(token);
  if (check.status === "invalid" || check.status === "reuse") return fail(401, "Session ended.");
  const { row } = check;

  // A newer sign-in elsewhere ended this one.
  const version = await deps.sessionVersionOf(row.central_id);
  if (version === null || version !== row.session_version) {
    await revokeFamily(row.family_id);
    return fail(401, "Session ended.");
  }

  // The person as Central knows them now, before anything is turned over: a failed lookup leaves the token usable.
  let user: HubUser | null;
  try {
    user = await deps.resolveIdentity(row.central_id, row.source as "employee" | "student");
  } catch {
    return fail(503, "Try again shortly.");
  }
  if (!user) {
    await revokeFamily(row.family_id);
    return fail(401, "Your account is no longer active.");
  }

  const access = await signAccessToken(user, deps.tagsFor(user), row.family_id);
  const refresh = check.status === "ok" ? await rotateRefreshToken(row) : null;
  setSharedCookies(c, { access, ...(refresh ? { refresh } : {}), familyExpiresAt: row.family_expires_at });
  return c.json({ data: { expires_in: accessTtlSeconds() } });
}
