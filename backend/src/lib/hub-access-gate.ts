import {
  CentralRateLimitedError,
  isBatchLookupUnavailable,
  lookupApplicationEntitlement,
  lookupApplicationEntitlements,
} from "./central-client";
import { HUB_ADMIN_PERMISSION, HUB_USE_PERMISSION } from "./hub-permissions";
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

// Emergency accounts: let in, as admin, when Central gives them no way in, so a wrong Central setup cannot lock everyone out.
function bypassEmails(): Set<string> {
  return new Set(
    (process.env.HUB_CENTRAL_ACCESS_BYPASS_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type HubAccess = {
  status: "granted" | "bypass" | "no_access" | "no_permission" | "central_unavailable";
  role: string | null;
  permissions: string[];
};

const cache = new Map<string, { at: number; entitlement: CentralApplicationEntitlement | null }>();

export function clearHubAccessCacheForTest() {
  cache.clear();
  revoked.clear();
}

// Central decides. An account in the bypass list only gets in on its own when Central gives it no way in, so a role
// set in Central (staff, admin) always applies to it too.
export async function resolveHubAccess(user: HubUser, maxAgeMs: number): Promise<HubAccess> {
  const access = await resolveCentralAccess(user, maxAgeMs);
  if (access.status !== "granted" && bypassEmails().has(user.email.trim().toLowerCase())) {
    return { status: "bypass", role: null, permissions: [] };
  }
  return access;
}

async function resolveCentralAccess(user: HubUser, maxAgeMs: number): Promise<HubAccess> {
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
  // An active access whose role does not carry the permission to use Hub does not get in.
  if (!entitlement.permissions.includes(HUB_USE_PERMISSION)) {
    return { status: "no_permission", role: entitlement.role, permissions: entitlement.permissions };
  }
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

// A grant Central confirmed lately is still shown for this long when Central cannot be asked, so a limit or an outage
// does not empty the menu. Taking access away is seen again as soon as Central answers.
function staleMs(): number {
  const seconds = Number(process.env.HUB_CENTRAL_ACCESS_STALE_SECONDS);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 600) * 1000;
}

export type CentralAccessAnswer = {
  access: Map<string, "granted" | "denied" | "unknown">;
  // Set when Central could not be asked and some card is left unknown. `retryAfterSeconds` is what Central asked for.
  unavailable: { retryAfterSeconds: number | null } | null;
};

// Fallback for a Central without the batch endpoint: one request per card, a few at a time so it is not a burst.
const FALLBACK_CONCURRENCY = 5;

export async function centralAccessForApps(user: HubUser, appIds: string[]): Promise<CentralAccessAnswer> {
  const uniqueIds = [...new Set(appIds)];
  const access = new Map<string, "granted" | "denied" | "unknown">();
  const missing: string[] = [];
  let unavailable: CentralAccessAnswer["unavailable"] = null;

  for (const appId of uniqueIds) {
    const cached = appCache.get(`${appId}:${user.person_id}`);
    if (cached && Date.now() - cached.at < cacheMs()) {
      access.set(appId, "granted");
    } else {
      missing.push(appId);
    }
  }

  const remember = (appId: string, granted: boolean) => {
    if (granted) appCache.set(`${appId}:${user.person_id}`, { at: Date.now(), active: true });
    access.set(appId, granted ? "granted" : "denied");
  };

  // Central could not answer for these cards: a grant from a little while ago still counts, else it stays unknown.
  const useLastKnown = (appIds: string[], error: unknown) => {
    for (const appId of appIds) {
      const last = appCache.get(`${appId}:${user.person_id}`);
      if (last && Date.now() - last.at < staleMs()) {
        access.set(appId, "granted");
      } else {
        access.set(appId, "unknown");
        unavailable = {
          retryAfterSeconds: error instanceof CentralRateLimitedError ? error.retryAfterSeconds : (unavailable?.retryAfterSeconds ?? null),
        };
      }
    }
  };

  for (let index = 0; index < missing.length; index += 50) {
    const applicationIds = missing.slice(index, index + 50);
    try {
      const entitlements = await lookupApplicationEntitlements(user.person_id, applicationIds);
      const granted = new Set(entitlements.filter((entitlement) => entitlement.is_active).map((entitlement) => entitlement.application_id));
      for (const appId of applicationIds) remember(appId, granted.has(appId));
    } catch (error) {
      if (!isBatchLookupUnavailable(error)) {
        logger.error("Central batch access lookup failed for cards:", error);
        useLastKnown(applicationIds, error);
        continue;
      }
      for (let start = 0; start < applicationIds.length; start += FALLBACK_CONCURRENCY) {
        const group = applicationIds.slice(start, start + FALLBACK_CONCURRENCY);
        const answers = await Promise.allSettled(group.map((appId) => lookupApplicationEntitlement(user.person_id, appId)));
        answers.forEach((answer, position) => {
          const appId = group[position]!;
          if (answer.status === "fulfilled") {
            remember(appId, Boolean(answer.value?.is_active));
            return;
          }
          logger.error(`Central individual access lookup failed for card ${appId}:`, answer.reason);
          useLastKnown([appId], answer.reason);
        });
      }
    }
  }

  return { access, unavailable };
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

// An emergency account has every Hub permission while Central gives it no access, so it can fix the setup.
export async function userHasHubPermission(user: HubUser, permission: string): Promise<boolean> {
  const access = await resolveHubAccess(user, cacheMs());
  if (access.status === "bypass") return true;
  return access.status === "granted" && access.permissions.includes(permission);
}

// Called at sign-in, before a session exists.
export async function enforceHubAccessOnLogin(user: HubUser): Promise<void> {
  const mode = hubAccessMode();
  if (mode === "off") return;

  const access = await resolveHubAccess(user, cacheMs());
  if (access.status === "granted") return;
  if (access.status === "bypass") {
    // Only enforce turns anyone away, so only there does the bypass let someone in who might not be.
    if (mode === "enforce") await audit(user, "hub.login_bypass", `${user.email} signed in with emergency sign-in`);
    return;
  }

  if (access.status === "central_unavailable") {
    if (mode === "enforce") {
      throw new ResponseError(503, "Central is not reachable. Try again in a moment.", "central_unavailable");
    }
    logger.info(`Hub access check skipped, Central not reachable: ${user.email}`);
    return;
  }

  const missingPermission = access.status === "no_permission";
  if (mode === "enforce") {
    await audit(
      user,
      "hub.login_denied",
      missingPermission
        ? `${user.email} was turned away: role ${access.role} has no ${HUB_USE_PERMISSION} permission`
        : `${user.email} was turned away: no Hub access in Central`,
    );
    throw missingPermission
      ? new ResponseError(403, "Your role does not include Hub access. Ask a Super Admin.", "hub_use_missing")
      : new ResponseError(403, "You don't have access to Hub yet. Ask a Super Admin.", "hub_access_denied");
  }
  logger.info(`Hub access would be denied: ${user.email}`);
  await audit(
    user,
    "hub.login_would_deny",
    missingPermission
      ? `${user.email} has role ${access.role} without ${HUB_USE_PERMISSION} (warn mode, let in)`
      : `${user.email} has no Hub access in Central (warn mode, let in)`,
  );
}

const REVOKE_AGAIN_MS = 5 * 60_000;
const revoked = new Map<string, number>();

// Called on every authenticated request in enforce mode, so taking the access
// away in Central reaches people who are already signed in. A Central outage
// does not sign anyone out: they already passed the check at sign-in.
export async function ensureHubAccessForSession(user: HubUser): Promise<void> {
  if (hubAccessMode() !== "enforce") return;
  const access = await resolveHubAccess(user, cacheMs());
  if (access.status === "no_access" || access.status === "no_permission") {
    // Also end their sessions in the apps opened through Hub, once per removal.
    const last = revoked.get(user.person_id);
    if (!last || Date.now() - last > REVOKE_AGAIN_MS) {
      revoked.set(user.person_id, Date.now());
      void revokeSessionsForUser(user.email, user.person_id).catch(() => {});
    }
    throw new ResponseError(401, "Access to Hub was removed.");
  }
}
