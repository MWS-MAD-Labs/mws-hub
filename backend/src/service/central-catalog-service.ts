import { listPublishedApplications, type CentralPublishedApplication } from "../lib/central-client";
import { logger } from "../lib/logger";
import type { HubCatalogEntry } from "../type/catalog-type";

const CACHE_MS = 60_000;
const HUB_CATEGORIES = new Set(["reporting", "students", "workplace", "operations", "utilities"]);

let cache: { at: number; entries: HubCatalogEntry[] } | null = null;

export function clearCentralCatalogCacheForTest() {
  cache = null;
}

// A card for an application Central published. Who sees it is decided by Central access alone.
export function toCentralEntry(app: CentralPublishedApplication): HubCatalogEntry {
  const category = (app.category || "").trim().toLowerCase();
  return {
    id: app.id,
    name: app.name,
    icon: app.icon || "AppWindow",
    description: app.description || "",
    category: HUB_CATEGORIES.has(category) ? category : "utilities",
    audience: "People with access",
    keywords: [],
    href: app.launch_url,
    external: true,
    status: "active",
    discoverable: true,
    allowedSources: [],
    centralEntitlementAppId: app.id,
    sso: {
      appId: app.id,
      entryUrl: app.launch_url,
      ...(app.logout_url ? { logoutUrl: app.logout_url } : {}),
      centralEntitlementAppId: app.id,
    },
    source: "central",
  };
}

// Cached for a minute. When Central cannot be reached the last answer is kept, and with none yet
// the list is empty, so Hub itself never stops working because of it.
export async function centralCatalogEntries(): Promise<HubCatalogEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.entries;
  try {
    const entries = (await listPublishedApplications()).map(toCentralEntry);
    cache = { at: Date.now(), entries };
    return entries;
  } catch (error) {
    logger.error("Could not read the published applications from Central:", error);
    // Try again on the next request, but keep serving what was known.
    return cache?.entries ?? [];
  }
}
