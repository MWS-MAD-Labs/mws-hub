import { createHmac, timingSafeEqual } from "node:crypto";

// The secret of one application, made from the Hub's master secret (HUB_INTERNAL_SECRET). It is the same function
// Central uses to put the secret in an application's .env, so the Hub makes it again to check one. Only the master
// can make a valid one, and one application's secret says nothing about another's.
export function deriveAppSecret(master: string, applicationId: string, version: number): string {
  const mac = createHmac("sha256", master).update(`app:${applicationId}:${version}`).digest("hex");
  return `v${version}.${mac}`;
}

// The version a presented secret claims, or null when it does not look like one.
export function secretVersion(presented: string): number | null {
  const match = /^v(\d{1,6})\.[0-9a-f]{64}$/.exec(presented);
  return match ? Number(match[1]) : null;
}

export function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

// The current version of the secret of an application, from the catalog Central publishes. 1 when it is not known.
async function currentVersion(applicationId: string): Promise<number> {
  // Loaded here so checking a secret does not pull in the database client unless it has to.
  const { AppsService } = await import("../service/apps-service");
  const entry = await AppsService.findByLaunchId(applicationId).catch(() => null);
  return entry?.hubSecret?.version ?? 1;
}

// Whether a secret sent by an application's backend is good. The master is still accepted while
// HUB_ALLOW_SHARED_SECRET is not "false", so applications can move to their own secret one at a time.
export async function acceptsInternalSecret(provided: string, master: string, applicationId: string | null): Promise<boolean> {
  if (!provided) return false;
  if (process.env.HUB_ALLOW_SHARED_SECRET !== "false" && sameSecret(provided, master)) return true;
  const version = secretVersion(provided);
  if (version === null || !applicationId) return false;
  if (!sameSecret(provided, deriveAppSecret(master, applicationId, version))) return false;
  // After a rotation the old version stops working.
  return version >= (await currentVersion(applicationId));
}
