import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
import type { HubCatalogEntry } from "../type/catalog-type";
import type { HubUser } from "../type/central-type";

const entry = (id: string, extra: Partial<HubCatalogEntry> = {}): HubCatalogEntry =>
  ({
    id,
    name: id,
    icon: "app",
    description: "",
    category: "tools",
    audience: "Employees",
    keywords: [],
    href: "https://example.test",
    external: true,
    status: "active",
    discoverable: true,
    allowedSources: ["public"],
    ...extra,
  }) as HubCatalogEntry;

let catalog: HubCatalogEntry[] = [];

mock.module("../service/application-service", () => ({
  ApplicationService: { listActive: async () => catalog },
}));

const { AppsService, setApprovedAccessLookupForTest } = await import("../service/apps-service");
const gate = await import("../lib/hub-access-gate");

setApprovedAccessLookupForTest(async () => new Set());

const user = {
  source: "employee",
  id: "emp-1",
  person_id: "person-1",
  employee_id: "E001",
  full_name: "Test Employee",
  nick_name: null,
  email: "employee@millennia21.id",
  photo_url: null,
  unit: null,
  job_position: null,
  job_level: null,
  status: "ACTIVE",
  employment_type: null,
} as HubUser;

const gated = (id: string, extra: Partial<HubCatalogEntry> = {}) =>
  entry(id, { sso: { appId: id, centralEntitlementAppId: id } as HubCatalogEntry["sso"], ...extra });

beforeEach(() => {
  gate.clearAppAccessCacheForTest();
  catalog = [gated("daily-checkin"), entry("plain")];
});

afterEach(() => {
  mock.restore();
});

describe("cards for apps gated by Central", () => {
  it("locks the card by Central when the person has no access", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    const listing = await AppsService.listFor(user);
    const card = listing.find((app) => app.id === "daily-checkin");
    expect(card?.access).toBe("locked");
    expect(card?.lockedBy).toBe("central");
    expect(listing.find((app) => app.id === "plain")?.access).toBe("granted");
  });

  it("leaves the card open when Central gives access", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({
      is_active: true,
    } as never);
    const card = (await AppsService.listFor(user)).find((app) => app.id === "daily-checkin");
    expect(card?.access).toBe("granted");
    expect(card?.lockedBy).toBeUndefined();
  });

  it("falls back to Hub rules when Central is down", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockRejectedValue(new Error("down"));
    const card = (await AppsService.listFor(user)).find((app) => app.id === "daily-checkin");
    expect(card?.access).toBe("granted");
    expect(card?.lockedBy).toBeUndefined();
  });

  it("keeps the maintenance status on a card the person can open", async () => {
    catalog = [gated("daily-checkin", { status: "maintenance" })];
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({
      is_active: true,
    } as never);
    const card = (await AppsService.listFor(user))[0];
    expect(card.status).toBe("maintenance");
    expect(card.access).toBe("granted");
  });

  it("does not ask Central for apps that are not gated", async () => {
    catalog = [entry("plain")];
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement");
    await AppsService.listFor(user);
    expect(lookup).not.toHaveBeenCalled();
  });
});
