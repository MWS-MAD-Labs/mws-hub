import { lookupApplicationEntitlement } from "./central-client";
import { HUB_ADMIN_PERMISSION } from "./hub-permissions";
import { logger } from "./logger";
import { revokeSessionsForUser } from "./session-revocation";
import { ResponseError } from "../error/response-error";
import type { CentralApplicationEntitlement, HubUser } from "../type/central-type";

// Whether signing in to Hub itself needs an active access in Central's
// Application Access (the application named by HUB_CENTRAL_ACCESS_APP_ID).
//   off     - not checked (default, how Hub always worked)
//   warn    - checked and logged, nobody is turned away
//   enforce - turned away without access
export type HubAccessMode = "off" | "warn" | "enforce";

// Only active access is cached, so a denial never lingers and granting is seen at once.
// Taking access away is seen once the cached entry is older than this.
function cacheMs(): number {
  const seconds = Number(process.env.HUB_CENTRAL_ACCESS_CACHE_SECONDS);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 30) * 1000;
}

export function hubAccessMode(): HubAccessMode {
  const raw = (process.env.HUB_CENTRAL_ACCESS_MODE || "off").trim().toLowerCase();
  if (raw === "warn" || raw === "enforce") return raw;
  if (raw !== "off") logger.error(`HUB_CENTRAL_ACCESS_MODE "${raw}" is not off, warn or enforce. Using off.`);
  return "off";
}

function accessAppId(): string {
  return process.env.HUB_CENTRAL_ACCESS_APP_ID || "hub";
}

// Accounts that always get in, so a wrong Central setup cannot lock everyone out.
function bypassEmails(): Set<string> {
  return new Set(
    (process.env.HUB_CENTRAL_ACCESS_BYPASS_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type HubAccess = {
  status: "granted" | "bypass" | "no_access" | "central_unavailable";
  role: string | null;
  permissions: string[];
};

const cache = new Map<string, { at: number; entitlement: CentralApplicationEntitlement | null }>();

export function clearHubAccessCacheForTest() {
  cache.clear();
  revoked.clear();
}

export async function resolveHubAccess(user: HubUser, maxAgeMs: number): Promise<HubAccess> {
  if (bypassEmails().has(user.email.trim().toLowerCase())) {
    return { status: "bypass", role: null, permissions: [] };
  }

  const key = `${accessAppId()}:${user.person_id}`;
  const cached = cache.get(key);
  let entitlement: CentralApplicationEntitlement | null;
  if (cached && Date.now() - cached.at < maxAgeMs) {
    entitlement = cached.entitlement;
  } else {
    try {
      entitlement = await lookupApplicationEntitlement(user.person_id, accessAppId());
    } catch (error) {
      logger.error("Central access lookup failed for Hub:", error);
      return { status: "central_unavailable", role: null, permissions: [] };
    }
    if (entitlement?.is_active) cache.set(key, { at: Date.now(), entitlement });
  }

  if (!entitlement?.is_active) return { status: "no_access", role: null, permissions: [] };
  return { status: "granted", role: entitlement.role, permissions: entitlement.permissions };
}

// For the app cards: does Central give this person access to a gated app?
// "unknown" when Central cannot be reached, so the card falls back to Hub's own rules.
const appCache = new Map<string, { at: number; active: boolean }>();

export function clearAppAccessCacheForTest() {
  appCache.clear();
}

export async function centralAccessForApp(user: HubUser, appId: string): Promise<"granted" | "denied" | "unknown"> {
  const key = `${appId}:${user.person_id}`;
  const cached = appCache.get(key);
  if (cached && Date.now() - cached.at < cacheMs()) return "granted";
  try {
    const entitlement = await lookupApplicationEntitlement(user.person_id, appId);
    const active = Boolean(entitlement?.is_active);
    if (active) appCache.set(key, { at: Date.now(), active });
    return active ? "granted" : "denied";
  } catch (error) {
    logger.error(`Central access lookup failed for card ${appId}:`, error);
    return "unknown";
  }
}

async function audit(user: HubUser, action: string, summary: string) {
  // Loaded here so importing the gate (for admin checks) does not pull in the database client.
  const { recordAuditLog } = await import("../service/audit-log-service");
  await recordAuditLog({
    actor: user,
    action,
    entity: { type: "hub_access", id: user.person_id },
    summary,
    metadata: { application_id: accessAppId() },
  });
}

// What Hub authorizes on is the permission the role carries, not the role's name.
export { HUB_ADMIN_PERMISSION };

export async function userHasHubPermission(user: HubUser, permission: string): Promise<boolean> {
  if (hubAccessMode() === "off") return false;
  const access = await resolveHubAccess(user, cacheMs());
  return access.status === "granted" && access.permissions.includes(permission);
}

// Called at sign-in, before a session exists.
export async function enforceHubAccessOnLogin(user: HubUser): Promise<void> {
  const mode = hubAccessMode();
  if (mode === "off") return;

  const access = await resolveHubAccess(user, cacheMs());
  if (access.status === "granted" || access.status === "bypass") return;

  if (access.status === "central_unavailable") {
    if (mode === "enforce") {
      throw new ResponseError(503, "Central is not reachable. Try again in a moment.", "central_unavailable");
    }
    logger.info(`Hub access check skipped, Central not reachable: ${user.email}`);
    return;
  }

  if (mode === "enforce") {
    await audit(user, "hub.login_denied", `${user.email} was turned away: no Hub access in Central`);
    throw new ResponseError(403, "You don't have access to Hub yet. Ask a Super Admin.", "hub_access_denied");
  }
  logger.info(`Hub access would be denied: ${user.email}`);
  await audit(user, "hub.login_would_deny", `${user.email} has no Hub access in Central (warn mode, let in)`);
}

const REVOKE_AGAIN_MS = 5 * 60_000;
const revoked = new Map<string, number>();

// Called on every authenticated request in enforce mode, so taking the access
// away in Central reaches people who are already signed in. A Central outage
// does not sign anyone out: they already passed the check at sign-in.
export async function ensureHubAccessForSession(user: HubUser): Promise<void> {
  if (hubAccessMode() !== "enforce") return;
  const access = await resolveHubAccess(user, cacheMs());
  if (access.status === "no_access") {
    // Also end their sessions in the apps opened through Hub, once per removal.
    const last = revoked.get(user.person_id);
    if (!last || Date.now() - last > REVOKE_AGAIN_MS) {
      revoked.set(user.person_id, Date.now());
      void revokeSessionsForUser(user.email, user.person_id).catch(() => {});
    }
    throw new ResponseError(401, "Access to Hub was removed.");
  }
}
