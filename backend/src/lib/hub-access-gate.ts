import { lookupApplicationEntitlement } from "./central-client";
import { logger } from "./logger";
import { ResponseError } from "../error/response-error";
import { recordAuditLog } from "../service/audit-log-service";
import type { CentralApplicationEntitlement, HubUser } from "../type/central-type";

// Whether signing in to Hub itself needs an active access in Central's
// Application Access (the application named by HUB_CENTRAL_ACCESS_APP_ID).
//   off     - not checked (default, how Hub always worked)
//   warn    - checked and logged, nobody is turned away
//   enforce - turned away without access
export type HubAccessMode = "off" | "warn" | "enforce";

const LOGIN_CACHE_MS = 60_000;
const SESSION_CACHE_MS = 5 * 60_000;

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
    cache.set(key, { at: Date.now(), entitlement });
  }

  if (!entitlement?.is_active) return { status: "no_access", role: null, permissions: [] };
  return { status: "granted", role: entitlement.role, permissions: entitlement.permissions };
}

async function audit(user: HubUser, action: string, summary: string) {
  await recordAuditLog({
    actor: user,
    action,
    entity: { type: "hub_access", id: user.person_id },
    summary,
    metadata: { application_id: accessAppId() },
  });
}

// Called at sign-in, before a session exists.
export async function enforceHubAccessOnLogin(user: HubUser): Promise<void> {
  const mode = hubAccessMode();
  if (mode === "off") return;

  const access = await resolveHubAccess(user, LOGIN_CACHE_MS);
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

// Called on every authenticated request in enforce mode, so taking the access
// away in Central reaches people who are already signed in. A Central outage
// does not sign anyone out: they already passed the check at sign-in.
export async function ensureHubAccessForSession(user: HubUser): Promise<void> {
  if (hubAccessMode() !== "enforce") return;
  const access = await resolveHubAccess(user, SESSION_CACHE_MS);
  if (access.status === "no_access") {
    throw new ResponseError(401, "Access to Hub was removed.");
  }
}
