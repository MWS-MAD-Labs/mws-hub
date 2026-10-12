import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
import { clearCentralCatalogCacheForTest } from "../service/central-catalog-service";
import type { HubCatalogEntry } from "../type/catalog-type";

type DisplayRow = { application_id: string; status: string; discoverable: boolean; keywords: string[] };
let display: DisplayRow[] = [];
let rows: Record<string, unknown>[] = [];
const upserts: unknown[] = [];

// Whatever stood there before is put back at the end, so other files are not left with this stand-in.
const previousPrisma = await import("../lib/prisma");

mock.module("../lib/prisma", () => ({
  prisma: {
    applicationDisplay: {
      findMany: async () => display,
      upsert: async (args: { create: DisplayRow }) => {
        upserts.push(args);
        display = [...display.filter((row) => row.application_id !== args.create.application_id), args.create];
      },
    },
    application: {
      findMany: async () => rows,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        rows = rows.map((row) => (row.id === where.id ? { ...row, ...data } : row));
      },
    },
  },
}));

// @ts-expect-error bun resolves the query string, tsc does not
const service = (await import("../service/application-display-service.ts?display")) as typeof import("../service/application-display-service");

const published = (id: string) => ({ id, name: id.toUpperCase(), description: "", icon: "Wallet", category: "utilities", launch_url: `https://${id}.test`, logout_url: null });
const card = (id: string): HubCatalogEntry =>
  ({ id, name: id, icon: "app", description: "", category: "utilities", audience: "x", keywords: [], href: "https://x.test", external: true, status: "active", discoverable: true, allowedSources: [] }) as HubCatalogEntry;

beforeEach(() => {
  display = [];
  rows = [];
  upserts.length = 0;
  service.clearDisplayCache();
  clearCentralCatalogCacheForTest();
  spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("daily"), published("exima")]);
  spyOn(centralClient, "getCentralTaxonomy").mockResolvedValue({ categories: [{ key: "utilities", name: "Utilities" }], scopes: [] });
});
afterEach(() => mock.restore());
afterAll(() => {
  clearCentralCatalogCacheForTest();
  mock.module("../lib/prisma", () => previousPrisma);
});

describe("display settings", () => {
  it("leaves a card as it is when nothing was set", async () => {
    const [entry] = await service.applyDisplay([card("daily")]);
    expect(entry!.status).toBe("active");
    expect(entry!.discoverable).toBe(true);
  });

  it("applies what was set to the card of that application only", async () => {
    display = [{ application_id: "daily", status: "MAINTENANCE", discoverable: false, keywords: ["checkin"] }];
    const [daily, exima] = await service.applyDisplay([card("daily"), card("exima")]);
    expect(daily).toMatchObject({ status: "maintenance", discoverable: false, keywords: ["checkin"] });
    expect(exima!.status).toBe("active");
  });

  it("checks what is sent", () => {
    const ok = service.parseDisplayInput({ status: "coming_soon", discoverable: true, keywords: [" Check In ", "check in", ""] });
    expect(ok).toEqual({ status: "COMING_SOON", discoverable: true, keywords: ["check in"] });
    expect(() => service.parseDisplayInput({ status: "gone", discoverable: true, keywords: [] })).toThrow();
    expect(() => service.parseDisplayInput({ status: "active", discoverable: "yes", keywords: [] })).toThrow();
    expect(() => service.parseDisplayInput({ status: "active", discoverable: true, keywords: "a" })).toThrow();
    expect(() => service.parseDisplayInput({ status: "active", discoverable: true, keywords: Array.from({ length: 21 }, (_, i) => `w${i}`) })).toThrow();
  });

  it("lists the applications Central publishes, then the older rows it does not cover", async () => {
    rows = [{ id: "old-tool", name: "Old Tool", icon: "app", category: "utilities", href: null, status: "NEW", discoverable: true, keywords: [], sso_central_entitlement_app_id: null }];
    const items = await service.ApplicationDisplayService.list();
    expect(items.map((item) => [item.id, item.in_central])).toEqual([["daily", true], ["exima", true], ["old-tool", false]]);
    expect(items[2]!.status).toBe("new");
  });

  it("saves the display of a Central application and shows it in the list", async () => {
    const item = await service.ApplicationDisplayService.update("daily", { status: "maintenance", discoverable: true, keywords: ["a"] }, "me@millennia21.id");
    expect(item).toMatchObject({ id: "daily", status: "maintenance", keywords: ["a"] });
    expect(upserts).toHaveLength(1);
  });

  it("updates the older Hub row instead when one covers the application", async () => {
    rows = [{ id: "daily", name: "Daily", icon: "app", category: "utilities", href: null, status: "ACTIVE", discoverable: true, keywords: [], sso_central_entitlement_app_id: null }];
    await service.ApplicationDisplayService.update("daily", { status: "maintenance", discoverable: false, keywords: [] }, "me@millennia21.id");
    expect(upserts).toHaveLength(0);
    expect(rows[0]).toMatchObject({ status: "MAINTENANCE", discoverable: false });
  });

  it("refuses an application Central does not publish", async () => {
    await expect(service.ApplicationDisplayService.update("ghost", { status: "active", discoverable: true, keywords: [] }, "me@millennia21.id")).rejects.toThrow(/does not publish/);
  });
});
