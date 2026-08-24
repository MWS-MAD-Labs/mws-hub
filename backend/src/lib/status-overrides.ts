import { logger } from "./logger";
import { HUB_CATALOG } from "../data/hub-catalog";
import type { HubAppStatus, HubCatalogEntry } from "../type/catalog-type";

// Lets an app's status be changed without editing the catalog and shipping a
// release: set HUB_APP_STATUS_OVERRIDES on the stack and redeploy.
//
//   HUB_APP_STATUS_OVERRIDES=exima:maintenance,woko:new
//
// This is a bridge, not the destination. The catalog belongs in Central as an
// Application model with an admin screen behind it, and when that lands this
// module and its env var should be deleted rather than kept alongside it -
// two places to set the same field is exactly the sort of split this codebase
// already had once, with SSO_APPS and the frontend catalog disagreeing.

const VALID_STATUSES: HubAppStatus[] = ["active", "maintenance", "coming_soon", "new"];

function isValidStatus(value: string): value is HubAppStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

// A malformed entry is skipped rather than thrown, because one typo in an env
// var must not take the whole hub down - but it is logged loudly, since a
// silently ignored override looks exactly like a broken deploy.
export function parseStatusOverrides(raw: string | undefined): Map<string, HubAppStatus> {
  const overrides = new Map<string, HubAppStatus>();
  if (!raw?.trim()) return overrides;

  const knownIds = new Set(HUB_CATALOG.map((entry) => entry.id));

  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const [id, status] = trimmed.split(":").map((part) => part?.trim());

    if (!id || !status) {
      logger.error(`Ignoring status override "${trimmed}": expected <appId>:<status>`);
      continue;
    }

    if (!knownIds.has(id)) {
      logger.error(`Ignoring status override "${trimmed}": no app with id "${id}"`);
      continue;
    }

    if (!isValidStatus(status)) {
      logger.error(
        `Ignoring status override "${trimmed}": status must be one of ${VALID_STATUSES.join(", ")}`,
      );
      continue;
    }

    overrides.set(id, status);
  }

  return overrides;
}

// Resolved once at startup: the env cannot change while the process runs, and
// re-parsing per request would only add work and log noise.
//
// Applied to the catalog itself rather than to the API response, so the
// listing and the launch gate read the same status. Applying it in one place
// only is how an app ends up hidden but still launchable, or shown but
// refused on click.
export function applyStatusOverrides(catalog: HubCatalogEntry[]): HubCatalogEntry[] {
  const overrides = parseStatusOverrides(process.env.HUB_APP_STATUS_OVERRIDES);
  if (overrides.size === 0) return catalog;

  logger.info(
    `Status overrides active: ${[...overrides].map(([id, s]) => `${id}=${s}`).join(", ")}`,
  );

  return catalog.map((entry) =>
    overrides.has(entry.id) ? { ...entry, status: overrides.get(entry.id)! } : entry,
  );
}
