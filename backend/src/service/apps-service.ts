import { applyStatusOverrides } from "../lib/status-overrides";
import {
  normalizeAccessToken,
  userMatchesAccessRule,
} from "../lib/access-rules";
import { ApplicationService } from "./application-service";
import type { HubUser } from "../type/central-type";
import type { HubAppResponse, HubCatalogEntry } from "../type/catalog-type";

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
}
