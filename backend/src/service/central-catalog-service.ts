import {
  getCentralTaxonomy,
  listPublishedApplications,
  type CentralPublishedApplication,
  type CentralTaxonomy,
} from "../lib/central-client";
import { logger } from "../lib/logger";
import type { HubCatalogEntry } from "../type/catalog-type";

const CACHE_MS = 60_000;
const VALID_STATUS = new Set(["active", "maintenance", "coming_soon", "new"]);
// What the Hub falls back on until Central has answered, the lists Central starts with.
export const FALLBACK_TAXONOMY: CentralTaxonomy = {
  categories: [
    { key: "reporting", name: "Reporting" },
    { key: "students", name: "Students" },
    { key: "workplace", name: "Workplace" },
    { key: "operations", name: "Operations" },
    { key: "utilities", name: "Utilities" },
  ],
  scopes: [
    { key: "safespace", name: "Safespace" },
    { key: "learnspace", name: "Learnspace" },
    { key: "carespace", name: "Carespace" },
    { key: "shieldspace", name: "Shieldspace" },
  ],
};

let taxonomyCache: { at: number; taxonomy: CentralTaxonomy } | null = null;

// Cached like the applications. With Central unreachable the last answer is kept, and the fallback
// stands in until there is one.
export async function centralTaxonomy(): Promise<CentralTaxonomy> {
  if (taxonomyCache && Date.now() - taxonomyCache.at < CACHE_MS) return taxonomyCache.taxonomy;
  try {
    const taxonomy = await getCentralTaxonomy();
    taxonomyCache = { at: Date.now(), taxonomy };
    return taxonomy;
  } catch (error) {
    logger.error("Could not read the categories and scopes from Central:", error);
    return taxonomyCache?.taxonomy ?? FALLBACK_TAXONOMY;
  }
}

let cache: { at: number; entries: HubCatalogEntry[] } | null = null;

export function clearCentralCatalogCacheForTest() {
  cache = null;
  taxonomyCache = null;
}

// A card for an application Central published. Who sees it is decided by Central access alone.
export function toCentralEntry(
  app: CentralPublishedApplication,
  taxonomy: CentralTaxonomy = FALLBACK_TAXONOMY,
): HubCatalogEntry {
  const category = (app.category || "").trim().toLowerCase();
  const scope = (app.scope || "").trim().toLowerCase();
  return {
    id: app.id,
    name: app.name,
    icon: app.icon || "AppWindow",
    description: app.description || "",
    category: taxonomy.categories.some((item) => item.key === category) ? category : "utilities",
    ...(taxonomy.scopes.some((item) => item.key === scope) ? { scope } : {}),
    audience: "People with access",
    keywords: Array.isArray(app.keywords) ? app.keywords.filter((word) => typeof word === "string") : [],
    href: app.launch_url,
    external: true,
    status: app.status && VALID_STATUS.has(app.status) ? app.status : "active",
    discoverable: true,
    allowedSources: [],
    centralEntitlementAppId: app.id,
    // A plain link is opened as it is. Who may see it is still decided by access in Central.
    ...(app.launch_mode === "link"
      ? {}
      : {
          sso: {
            appId: app.id,
            entryUrl: app.launch_url,
            ...(app.logout_url ? { logoutUrl: app.logout_url } : {}),
            centralEntitlementAppId: app.id,
          },
        }),
    source: "central",
    ...(app.hub_secret ? { hubSecret: app.hub_secret } : {}),
    ...(app.session_mode ? { sessionMode: app.session_mode } : {}),
  };
}

// What the Hub last learned from Central: the cards it publishes. With no answer yet, `read` is false.
export type CentralCatalogState = { read: boolean; entries: HubCatalogEntry[] };

// Cached for a minute. When Central cannot be reached the last answer is kept, and with none yet
// the list is empty, so Hub itself never stops working because of it.
export async function centralCatalogState(): Promise<CentralCatalogState> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { read: true, entries: cache.entries };
  try {
    const [published, taxonomy] = await Promise.all([listPublishedApplications(), centralTaxonomy()]);
    const entries = published.map((app) => toCentralEntry(app, taxonomy));
    cache = { at: Date.now(), entries };
    return { read: true, entries };
  } catch (error) {
    logger.error("Could not read the published applications from Central:", error);
    // Try again on the next request, but keep serving what was known.
    return cache ? { read: true, entries: cache.entries } : { read: false, entries: [] };
  }
}

export async function centralCatalogEntries(): Promise<HubCatalogEntry[]> {
  return (await centralCatalogState()).entries;
}
