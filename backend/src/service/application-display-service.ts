import { logger } from "../lib/logger";
import { ResponseError } from "../error/response-error";
import { ApplicationStatus } from "../generated/prisma/enums";
import type { HubAppStatus, HubCatalogEntry } from "../type/catalog-type";
import { centralCatalogEntries } from "./central-catalog-service";

// How a card is shown is the one thing the Hub decides about an application Central publishes: its status,
// whether it can be found, and the words it can be found by. Everything else comes from Central.

const TO_STATUS: Record<ApplicationStatus, HubAppStatus> = {
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
  COMING_SOON: "coming_soon",
  NEW: "new",
};

type Display = { status: ApplicationStatus; discoverable: boolean; keywords: string[] };

const CACHE_MS = 30_000;
let cache: { at: number; rows: Map<string, Display> } | null = null;

export function clearDisplayCache() {
  cache = null;
}

// A failure to read this must not stop the launcher, so the cards fall back to their defaults.
async function displayRows(): Promise<Map<string, Display>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  try {
    // Loaded here so reading the cards does not need the database client until it has to.
    const { prisma } = await import("../lib/prisma");
    const rows = await prisma.applicationDisplay.findMany();
    const map = new Map(rows.map((row) => [row.application_id, { status: row.status, discoverable: row.discoverable, keywords: row.keywords }]));
    cache = { at: Date.now(), rows: map };
    return map;
  } catch (error) {
    logger.error("Could not read the display settings:", error);
    return cache?.rows ?? new Map();
  }
}

// The cards Central added, with what the Hub set for them.
export async function applyDisplay(entries: HubCatalogEntry[]): Promise<HubCatalogEntry[]> {
  const rows = await displayRows();
  if (rows.size === 0) return entries;
  return entries.map((entry) => {
    const display = rows.get(entry.id);
    return display ? { ...entry, status: TO_STATUS[display.status], discoverable: display.discoverable, keywords: display.keywords } : entry;
  });
}

export type DisplayInput = { status?: unknown; discoverable?: unknown; keywords?: unknown };

const STATUSES = new Set<string>(Object.values(ApplicationStatus));

export function parseDisplayInput(input: DisplayInput): Display {
  const status = typeof input.status === "string" ? input.status.toUpperCase() : "";
  if (!STATUSES.has(status)) throw new ResponseError(400, "Status must be active, maintenance, coming_soon or new.");
  if (typeof input.discoverable !== "boolean") throw new ResponseError(400, "Discoverable must be true or false.");
  if (!Array.isArray(input.keywords) || input.keywords.some((word) => typeof word !== "string")) {
    throw new ResponseError(400, "Keywords must be a list of words.");
  }
  const keywords = [...new Set((input.keywords as string[]).map((word) => word.trim().toLowerCase()).filter(Boolean))];
  if (keywords.length > 20) throw new ResponseError(400, "At most 20 keywords.");
  if (keywords.some((word) => word.length > 40)) throw new ResponseError(400, "A keyword is at most 40 characters.");
  return { status: status as ApplicationStatus, discoverable: input.discoverable, keywords };
}

export type DisplayItem = {
  id: string;
  name: string;
  icon: string;
  category: string;
  href: string | null;
  status: HubAppStatus;
  discoverable: boolean;
  keywords: string[];
  in_central: boolean;
};

export class ApplicationDisplayService {
  // Every application Central publishes, with its display settings, then the older Hub rows Central does not cover.
  static async list(): Promise<DisplayItem[]> {
    const { ApplicationService } = await import("./application-service");
    const [published, rows, display] = await Promise.all([centralCatalogEntries(), ApplicationService.listForAdmin(), displayRows()]);
    const rowFor = (id: string) => rows.find((row) => row.id === id || row.sso_central_entitlement_app_id === id);
    const covered = new Set<string>();
    const items: DisplayItem[] = published.map((entry) => {
      const row = rowFor(entry.id);
      if (row) covered.add(row.id);
      // A Hub row for the same application is what the launcher reads, so it is what shows here.
      const shown = row ?? display.get(entry.id);
      return {
        id: entry.id,
        name: entry.name,
        icon: entry.icon,
        category: entry.category,
        href: entry.href,
        status: shown ? TO_STATUS[shown.status] : "active",
        discoverable: shown ? shown.discoverable : true,
        keywords: shown ? shown.keywords : [],
        in_central: true,
      };
    });
    for (const row of rows) {
      if (covered.has(row.id)) continue;
      items.push({ id: row.id, name: row.name, icon: row.icon, category: row.category, href: row.href, status: TO_STATUS[row.status], discoverable: row.discoverable, keywords: row.keywords, in_central: false });
    }
    return items;
  }

  // Sets the display of one application Central publishes. A Hub row for it is updated instead, because that row wins.
  static async update(id: string, input: DisplayInput, actorEmail: string): Promise<DisplayItem> {
    const parsed = parseDisplayInput(input);
    const { prisma } = await import("../lib/prisma");
    const { ApplicationService } = await import("./application-service");
    const published = await centralCatalogEntries();
    if (!published.some((entry) => entry.id === id)) {
      throw new ResponseError(404, `Central does not publish "${id}".`);
    }
    const rows = await ApplicationService.listForAdmin();
    const row = rows.find((item) => item.id === id || item.sso_central_entitlement_app_id === id);
    if (row) {
      await prisma.application.update({ where: { id: row.id }, data: parsed });
    } else {
      await prisma.applicationDisplay.upsert({
        where: { application_id: id },
        create: { application_id: id, ...parsed, updated_by: actorEmail },
        update: { ...parsed, updated_by: actorEmail },
      });
    }
    clearDisplayCache();
    const item = (await ApplicationDisplayService.list()).find((entry) => entry.id === id);
    if (!item) throw new ResponseError(404, `Unknown application: ${id}`);
    return item;
  }
}
