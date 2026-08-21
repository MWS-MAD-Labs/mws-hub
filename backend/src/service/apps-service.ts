import { HUB_CATALOG } from "../data/hub-catalog";
import type { CentralClaim, HubUser } from "../type/central-type";
import type { HubAppResponse, HubCatalogEntry } from "../type/catalog-type";

const KNOWN_ACCESS_SOURCES = new Set<HubCatalogEntry["allowedSources"][number]>([
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

  if ((tokens.has("mad") && tokens.has("labs")) || normalized.includes("mad-labs")) {
    sources.add("mad-labs");
  }
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
      user.unit,
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

export class AppsService {
  static listFor(user: HubUser): HubAppResponse[] {
    return HUB_CATALOG.filter((entry) => isVisibleTo(entry, user)).map(toResponse);
  }

  static findByLaunchId(appId: string): HubCatalogEntry | null {
    return HUB_CATALOG.find((entry) => entry.id === appId || entry.sso?.appId === appId) ?? null;
  }
}
