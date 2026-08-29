import { applyStatusOverrides } from "../lib/status-overrides";
import { ApplicationService } from "./application-service";
import type { CentralClaim, HubUser } from "../type/central-type";
import type { HubAccessSource, HubAppResponse, HubCatalogEntry } from "../type/catalog-type";

export const KNOWN_ACCESS_SOURCES = new Set<HubCatalogEntry["allowedSources"][number]>([
  "public",
  "employee",
  "student",
  "teacher",
  "staff",
  "principal",
  "director",
  "admin",
  "resource",
  "head-unit",
  "mad-labs",
]);

const ACCESS_ALIASES: Record<string, HubCatalogEntry["allowedSources"][number]> = {
  teachers: "teacher",
  guru: "teacher",
  "homeroom-teacher": "teacher",
  "wali-kelas": "teacher",
  principals: "principal",
  "head-of-school": "principal",
  "kepala-sekolah": "principal",
  kepsek: "principal",
  directors: "director",
  direktur: "director",
  administrator: "admin",
  "database-admin": "admin",
  "super-admin": "admin",
  superadmin: "admin",
  resources: "resource",
  inventory: "resource",
  asset: "resource",
  assets: "resource",
  "resource-team": "resource",
  "resource-department": "resource",
  "head-unit": "head-unit",
  "head-of-unit": "head-unit",
  "unit-head": "head-unit",
  headunit: "head-unit",
  "kepala-unit": "head-unit",
  coordinator: "head-unit",
  "mad-lab": "mad-labs",
  madlabs: "mad-labs",
  "mad-labs": "mad-labs",
  "millennia-advanced-digital-labs": "mad-labs",
};

function normalizeAccessToken(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function claimToStrings(claim: CentralClaim): string[] {
  if (typeof claim === "string") return [claim];

  return [
    claim.name,
    claim.slug,
    claim.key,
    claim.code,
    claim.role,
    claim.permission,
  ].filter((value): value is string => Boolean(value));
}

function normalizedClaims(claims: Array<CentralClaim | null | undefined>): Set<string> {
  const values = new Set<string>();

  claims.forEach((claim) => {
    if (!claim) return;
    claimToStrings(claim).forEach((value) => {
      const normalized = normalizeAccessToken(value);
      if (normalized) values.add(normalized);
    });
  });

  return values;
}

function addKnownSource(
  sources: Set<HubCatalogEntry["allowedSources"][number]>,
  rawValue: string | null | undefined,
) {
  if (!rawValue) return;

  const normalized = normalizeAccessToken(rawValue);
  const tokens = new Set(normalized.split("-").filter(Boolean));
  const direct = KNOWN_ACCESS_SOURCES.has(
    normalized as HubCatalogEntry["allowedSources"][number],
  )
    ? (normalized as HubCatalogEntry["allowedSources"][number])
    : null;
  const aliased = ACCESS_ALIASES[normalized];

  if (direct) sources.add(direct);
  if (aliased) sources.add(aliased);

  if (tokens.has("teacher") || tokens.has("teachers") || tokens.has("guru")) {
    sources.add("teacher");
  }

  if (tokens.has("principal") || normalized.includes("kepala-sekolah")) {
    sources.add("principal");
  }

  if (tokens.has("director") || tokens.has("direktur")) {
    sources.add("director");
  }

  if (tokens.has("admin") || tokens.has("administrator")) {
    sources.add("admin");
  }

  if (tokens.has("resource") || tokens.has("inventory") || tokens.has("asset")) {
    sources.add("resource");
  }

  if (
    normalized.includes("head-unit") ||
    normalized.includes("head-of-unit") ||
    normalized.includes("unit-head") ||
    normalized.includes("kepala-unit")
  ) {
    sources.add("head-unit");
  }

  if (
    (tokens.has("mad") && (tokens.has("lab") || tokens.has("labs"))) ||
    normalized.includes("mad-lab")
  ) {
    sources.add("mad-labs");
  }
}

function userUnitName(user: HubUser): string | null {
  if (user.source !== "employee") return null;
  if (typeof user.unit === "string") return user.unit;
  return user.unit?.name || null;
}

function getUserAccessSources(user: HubUser): Set<HubCatalogEntry["allowedSources"][number]> {
  const sources = new Set<HubCatalogEntry["allowedSources"][number]>([
    "public",
    user.source,
  ]);

  if (user.source === "student") {
    return sources;
  }

  // In Hub's audience table, "Staff" means any active employee account.
  // More specific employee audiences are added from Central role/permission
  // fields first, then from the existing job metadata as a compatibility
  // fallback while Central's lookup shape evolves.
  sources.add("staff");

  const centralClaims = [
    user.role,
    ...(user.roles || []).flatMap(claimToStrings),
    ...(user.permissions || []).flatMap(claimToStrings),
  ];
  centralClaims.forEach((value) => addKnownSource(sources, value));

  if (!centralClaims.some(Boolean)) {
    [
      user.job_position,
      user.job_level,
      userUnitName(user),
      user.employment_type,
    ].forEach((value) => addKnownSource(sources, value));
  }

  return sources;
}

function getUserPermissionClaims(user: HubUser): Set<string> {
  return normalizedClaims([user.role, ...(user.roles || []), ...(user.permissions || [])]);
}

function appPermissionAliases(entry: HubCatalogEntry): Set<string> {
  const ids = [entry.id, entry.sso?.appId].filter((value): value is string => Boolean(value));
  const aliases = new Set<string>();

  ids.forEach((id) => {
    [
      `hub:apps:${id}`,
      `hub:apps:${id}:launch`,
      `mws-hub:apps:${id}`,
      `mws-hub:apps:${id}:launch`,
      `apps:${id}:launch`,
      `app:${id}:launch`,
    ].forEach((alias) => aliases.add(normalizeAccessToken(alias)));
  });

  return aliases;
}

function hasExplicitAppPermission(entry: HubCatalogEntry, user: HubUser): boolean {
  const userPermissions = getUserPermissionClaims(user);
  const acceptedPermissions = appPermissionAliases(entry);

  for (const permission of acceptedPermissions) {
    if (userPermissions.has(permission)) return true;
  }

  return false;
}

// The access lever. One predicate behind both the catalog and the launch
// gate, so an app can never be visible to someone who would be turned away
// on click, or openable by someone it was hidden from.
export function canAccess(entry: HubCatalogEntry, user: HubUser): boolean {
  const userSources = getUserAccessSources(user);
  const sourceAllowed = entry.allowedSources.some((source) => userSources.has(source));

  return sourceAllowed || hasExplicitAppPermission(entry, user);
}

// Visibility adds the display lever on top. `discoverable: false` keeps an
// app out of the grid without revoking access, which is the whole reason
// the two flags are separate.
export function isVisibleTo(entry: HubCatalogEntry, user: HubUser): boolean {
  return entry.discoverable && canAccess(entry, user);
}

function toResponse(entry: HubCatalogEntry): HubAppResponse {
  const { allowedSources, sso, ...rest } = entry;
  void allowedSources;

  return {
    ...rest,
    access: "granted",
    ...(sso ? { ssoAppId: sso.appId } : {}),
  };
}

// The catalog comes from Hub's database now, not from a code file, which is
// what makes the admin screen able to add and hide apps without a release.
// HUB_APP_STATUS_OVERRIDES still applies on top as an emergency lever that
// works without touching the database.
async function effectiveCatalog(): Promise<HubCatalogEntry[]> {
  return applyStatusOverrides(await ApplicationService.listActive());
}

export class AppsService {
  static async listFor(user: HubUser): Promise<HubAppResponse[]> {
    const catalog = await effectiveCatalog();
    return catalog.filter((entry) => isVisibleTo(entry, user)).map(toResponse);
  }

  static async findByLaunchId(appId: string): Promise<HubCatalogEntry | null> {
    const catalog = await effectiveCatalog();
    return (
      catalog.find((entry) => entry.id === appId || entry.sso?.appId === appId) ?? null
    );
  }

  // The same interpretation of Central's job_position/job_level/unit that
  // decides what this person can open in Hub, handed to a satellite app so
  // it can reach the same conclusion instead of re-deriving its own from
  // scratch. Central has no fixed role vocabulary - job_level is free-text,
  // admin-editable master data - so every app that interprets it separately
  // is a place that can silently disagree with Hub about the same person.
  static accessTagsFor(user: HubUser): HubAccessSource[] {
    return Array.from(getUserAccessSources(user));
  }

  // Every satellite app's own no-UI "clear my local session" page, for
  // fanning out on Hub logout. Not filtered by who's asking or by catalog
  // visibility/access - a person's own session on an app they can no longer
  // see (revoked access, app hidden) still needs clearing, and loading this
  // page for an app the browser never actually opened is harmless (there's
  // nothing there to clear).
  static async logoutTargets(): Promise<string[]> {
    const catalog = await effectiveCatalog();
    return catalog.map((entry) => entry.sso?.logoutUrl).filter(
      (url): url is string => Boolean(url),
    );
  }
}
