import { applyStatusOverrides } from "../lib/status-overrides";
import {
  normalizeAccessToken,
  userMatchesAccessRule,
} from "../lib/access-rules";
import { ApplicationService } from "./application-service";
import type { CentralClaim, HubUser } from "../type/central-type";
import type { HubAccessSource, HubAppResponse, HubCatalogEntry } from "../type/catalog-type";

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

function addAccessTag(tags: Set<HubAccessSource>, rawValue: string | null | undefined) {
  if (!rawValue) return;

  const normalized = normalizeAccessToken(rawValue);
  if (!normalized) return;

  tags.add(normalized);
  normalized
    .split("-")
    .filter(Boolean)
    .forEach((token) => tags.add(token));
}

function namedValue(
  value: string | { name?: string | null } | null | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.name || null;
  return null;
}

function getUserAccessTags(user: HubUser): Set<HubAccessSource> {
  const tags = new Set<HubAccessSource>([
    "public",
    user.source,
  ]);

  [user.role, ...(user.roles || []), ...(user.permissions || [])].forEach((claim) => {
    if (!claim) return;
    claimToStrings(claim).forEach((value) => addAccessTag(tags, value));
  });

  if (user.source === "employee") {
    [
      namedValue(user.unit),
      namedValue(user.job_position),
      namedValue(user.job_level),
      user.employment_type,
    ].forEach((value) => addAccessTag(tags, value));
  }

  return tags;
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
  const userPermissions = user.permissions || [];
  const acceptedPermissions = appPermissionAliases(entry);

  for (const claim of userPermissions) {
    const values =
      typeof claim === "string"
        ? [claim]
        : [claim.name, claim.slug, claim.key, claim.code, claim.role, claim.permission];
    for (const value of values) {
      if (value && acceptedPermissions.has(normalizeAccessToken(value))) return true;
    }
  }

  return false;
}

// The access lever. One predicate behind both the catalog and the launch
// gate, so an app can never be visible to someone who would be turned away
// on click, or openable by someone it was hidden from.
export function canAccess(entry: HubCatalogEntry, user: HubUser): boolean {
  const sourceAllowed = entry.allowedSources.some((source) =>
    userMatchesAccessRule(source, user),
  );

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
    return Array.from(getUserAccessTags(user));
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
