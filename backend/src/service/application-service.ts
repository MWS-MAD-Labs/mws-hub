import { prisma } from "../lib/prisma";
import { KNOWN_ACCESS_SOURCES } from "./apps-service";
import { ResponseError } from "../error/response-error";
import type {
  HubAccessSource,
  HubAppStatus,
  HubCatalogEntry,
} from "../type/catalog-type";
import type { Application } from "../generated/prisma/client";
import { ApplicationStatus } from "../generated/prisma/enums";

// The catalog now lives in Hub's database. This module is the only place
// that knows the database shape; everything downstream keeps working with
// HubCatalogEntry, the same type the code-file catalog used, so the access
// policy and launch gate did not have to change at all.

const TO_STATUS: Record<ApplicationStatus, HubAppStatus> = {
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
  COMING_SOON: "coming_soon",
  NEW: "new",
};

const FROM_STATUS: Record<HubAppStatus, ApplicationStatus> = {
  active: ApplicationStatus.ACTIVE,
  maintenance: ApplicationStatus.MAINTENANCE,
  coming_soon: ApplicationStatus.COMING_SOON,
  new: ApplicationStatus.NEW,
};

const CATALOG_CATEGORIES = new Set([
  "reporting",
  "students",
  "workplace",
  "operations",
  "utilities",
]);
// "new" is here because requirement 8 asks for it explicitly - it puts a
// badge on the card. "coming_soon" stays out: it overlaps with an app that
// simply has no URL yet, and two ways to say the same thing is what makes a
// form confusing to fill in.
const ALLOWED_STATUSES = new Set<HubAppStatus>(["active", "maintenance", "new"]);

export function toCatalogEntry(row: Application): HubCatalogEntry {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    audience: row.audience,
    category: row.category,
    keywords: row.keywords,
    href: row.href,
    external: row.external,
    status: TO_STATUS[row.status],
    discoverable: row.discoverable,
    allowedSources: row.allowed_sources as HubAccessSource[],
    ...(row.sso_app_id && row.sso_entry_url
      ? {
          sso: {
            appId: row.sso_app_id,
            entryUrl: row.sso_entry_url,
            ...(row.sso_logout_url ? { logoutUrl: row.sso_logout_url } : {}),
          },
        }
      : {}),
  };
}

export type ApplicationInput = {
  id?: string;
  name: string;
  icon?: string;
  description: string;
  audience: string;
  category: string;
  keywords?: string[];
  href?: string | null;
  external?: boolean;
  status?: HubAppStatus;
  discoverable?: boolean;
  allowedSources?: HubAccessSource[];
  ssoAppId?: string | null;
  ssoEntryUrl?: string | null;
  ssoLogoutUrl?: string | null;
  sortOrder?: number;
};

// An app with an SSO handoff needs both halves or neither: appId is the
// audience claim the satellite verifies, entryUrl is where the browser is
// sent. One without the other produces a card that fails on click.
function assertSsoPairIsComplete(input: ApplicationInput) {
  const hasId = Boolean(input.ssoAppId);
  const hasUrl = Boolean(input.ssoEntryUrl);

  if (hasId !== hasUrl) {
    throw new ResponseError(
      400,
      "SSO apps need both an SSO app id and an SSO entry URL, or neither.",
    );
  }
}

function assertApplicationInput(input: ApplicationInput) {
  if (
    !input.name?.trim() ||
    !input.category?.trim() ||
    !input.audience?.trim()
  ) {
    throw new ResponseError(400, "Name, category, and audience are required.");
  }
  if (!CATALOG_CATEGORIES.has(input.category)) {
    throw new ResponseError(
      400,
      "Category is not supported by the Hub taxonomy.",
    );
  }
  if (!ALLOWED_STATUSES.has(input.status ?? "active")) {
    throw new ResponseError(
      400,
      "Status must be Active, Maintenance, or New.",
    );
  }
  if (input.status !== "maintenance" && !input.href) {
    throw new ResponseError(400, "An URL is required for active applications.");
  }
  if (input.status === "maintenance" && !input.href) {
    throw new ResponseError(
      400,
      "An URL is required for maintenance applications.",
    );
  }
  if (input.href) {
    try {
      new URL(input.href);
    } catch {
      throw new ResponseError(400, "Application URL is invalid.");
    }
  }
  if (!input.allowedSources?.length) {
    throw new ResponseError(400, "At least one allowed source is required.");
  }
  // An unrecognised key is worse than an empty list: nothing matches it, so
  // the app saves cleanly and then silently never appears for anybody. Fail
  // here instead, naming the offending value.
  const unknownSources = input.allowedSources.filter(
    (source) => !KNOWN_ACCESS_SOURCES.has(source),
  );
  if (unknownSources.length > 0) {
    throw new ResponseError(
      400,
      `Unknown access group(s): ${unknownSources.join(", ")}. Allowed: ${[...KNOWN_ACCESS_SOURCES].join(", ")}.`,
    );
  }
}

function toRow(input: ApplicationInput) {
  return {
    name: input.name,
    icon: input.icon || "AppWindow",
    description: input.description,
    audience: input.audience,
    category: input.category,
    keywords: input.keywords ?? [],
    href: input.href ?? null,
    external: input.external ?? true,
    status: FROM_STATUS[input.status ?? "active"],
    discoverable: input.discoverable ?? true,
    // Deny by default: an app created without an audience admits nobody
    // until someone says who it is for.
    allowed_sources: input.allowedSources ?? [],
    sso_app_id: input.ssoAppId ?? null,
    sso_entry_url: input.ssoEntryUrl ?? null,
    sso_logout_url: input.ssoLogoutUrl ?? null,
    sort_order: input.sortOrder ?? 0,
  };
}

export class ApplicationService {
  // Everything the launcher reads. Soft-deleted rows never come back.
  static async listActive(): Promise<HubCatalogEntry[]> {
    const rows = await prisma.application.findMany({
      where: { deleted_at: null },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    });
    return rows.map(toCatalogEntry);
  }

  // The admin screen sees the raw rows, including sort order and the SSO
  // fields the public response strips out.
  static async listForAdmin(): Promise<Application[]> {
    return prisma.application.findMany({
      where: { deleted_at: null },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    });
  }

  static async create(input: ApplicationInput): Promise<Application> {
    assertApplicationInput(input);
    assertSsoPairIsComplete(input);

    const id = (input.id || input.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!id) {
      throw new ResponseError(
        400,
        "Application id could not be derived from the name.",
      );
    }

    const existing = await prisma.application.findUnique({ where: { id } });
    if (existing) {
      throw new ResponseError(
        409,
        `An application with id "${id}" already exists.`,
      );
    }

    const sortOrder =
      input.sortOrder ??
      ((await prisma.application.aggregate({ _max: { sort_order: true } }))._max
        .sort_order ?? 0) + 10;
    return prisma.application.create({
      data: { id, ...toRow({ ...input, sortOrder }) },
    });
  }

  static async update(
    id: string,
    input: ApplicationInput,
  ): Promise<Application> {
    assertApplicationInput(input);
    assertSsoPairIsComplete(input);

    const existing = await prisma.application.findFirst({
      where: { id, deleted_at: null },
    });
    if (!existing) {
      throw new ResponseError(404, `Unknown application: ${id}`);
    }

    return prisma.application.update({ where: { id }, data: toRow(input) });
  }

  // Soft delete, so the reports and access requests already filed against
  // this app stay readable instead of blocking the delete on a foreign key.
  static async remove(id: string): Promise<void> {
    const existing = await prisma.application.findFirst({
      where: { id, deleted_at: null },
    });
    if (!existing) {
      throw new ResponseError(404, `Unknown application: ${id}`);
    }

    await prisma.application.update({
      where: { id },
      data: { deleted_at: new Date(), discoverable: false },
    });
  }
}
