import { prisma } from "../lib/prisma";
import { listCentralApplicationIds } from "../lib/central-client";
import { ResponseError } from "../error/response-error";
import { centralTaxonomy } from "./central-catalog-service";
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

const ALLOWED_STATUSES = new Set<HubAppStatus>([
  "active",
  "maintenance",
  "coming_soon",
  "new",
]);

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
    centralEntitlementAppId: row.sso_central_entitlement_app_id || row.id,
    ...(row.sso_central_entitlement_app_id ? { explicitCentralLink: row.sso_central_entitlement_app_id } : {}),
    ...(row.sso_app_id && row.sso_entry_url
      ? {
          sso: {
            appId: row.sso_app_id,
            entryUrl: row.sso_entry_url,
            ...(row.sso_logout_url ? { logoutUrl: row.sso_logout_url } : {}),
            ...(row.sso_central_entitlement_app_id
              ? { centralEntitlementAppId: row.sso_central_entitlement_app_id }
              : {}),
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
  centralEntitlementAppId?: string | null;
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

// The categories are Central's master data, so a new one there is usable here at once.
async function assertKnownCategory(category: string) {
  const { categories } = await centralTaxonomy();
  if (!categories.some((item) => item.key === category)) {
    throw new ResponseError(400, "Category is not one of the categories in Central.");
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
  if (!ALLOWED_STATUSES.has(input.status ?? "active")) {
    throw new ResponseError(
      400,
      "Status must be Active, Maintenance, Coming Soon, or New.",
    );
  }
  if (
    input.status !== "maintenance" &&
    input.status !== "coming_soon" &&
    !input.href
  ) {
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
  if (!input.centralEntitlementAppId?.trim()) {
    throw new ResponseError(400, "Central Application ID is required.");
  }
}

// The id is free text, and a wrong one hides the app from everybody. Check it
// against Central when it is set or changed.
async function assertCentralApplicationId(
  input: ApplicationInput,
  current?: string | null,
) {
  const id = input.centralEntitlementAppId;
  if (!id || id === current) return;
  let known: string[];
  try {
    known = await listCentralApplicationIds();
  } catch {
    throw new ResponseError(
      503,
      "Central could not be reached to check the Central application id. Try again in a moment.",
    );
  }
  if (!known.includes(id)) {
    throw new ResponseError(
      400,
      `Central has no application "${id}". Set it up in Application Access first, or fix the id.`,
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
    discoverable: true,
    allowed_sources: input.allowedSources ?? ["public"],
    sso_app_id: input.ssoAppId ?? null,
    sso_entry_url: input.ssoEntryUrl ?? null,
    sso_logout_url: input.ssoLogoutUrl ?? null,
    sso_central_entitlement_app_id: input.centralEntitlementAppId ?? null,
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

  static async getForAdmin(id: string): Promise<Application> {
    const application = await prisma.application.findFirst({
      where: { id, deleted_at: null },
    });
    if (!application) {
      throw new ResponseError(404, `Unknown application: ${id}`);
    }

    return application;
  }

  static async create(input: ApplicationInput): Promise<Application> {
    assertApplicationInput(input);
    await assertKnownCategory(input.category);
    assertSsoPairIsComplete(input);
    await assertCentralApplicationId(input);

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

    if (input.ssoAppId) {
      const existingSsoApp = await prisma.application.findFirst({
        where: { sso_app_id: input.ssoAppId },
      });
      if (existingSsoApp) {
        throw new ResponseError(
          409,
          `SSO app id "${input.ssoAppId}" is already used by "${existingSsoApp.id}".`,
        );
      }
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
    await assertKnownCategory(input.category);
    assertSsoPairIsComplete(input);

    const existing = await prisma.application.findFirst({
      where: { id, deleted_at: null },
    });
    if (!existing) {
      throw new ResponseError(404, `Unknown application: ${id}`);
    }

    await assertCentralApplicationId(
      input,
      existing.sso_central_entitlement_app_id,
    );

    if (input.ssoAppId) {
      const existingSsoApp = await prisma.application.findFirst({
        where: {
          sso_app_id: input.ssoAppId,
          NOT: { id },
        },
      });
      if (existingSsoApp) {
        throw new ResponseError(
          409,
          `SSO app id "${input.ssoAppId}" is already used by "${existingSsoApp.id}".`,
        );
      }
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
