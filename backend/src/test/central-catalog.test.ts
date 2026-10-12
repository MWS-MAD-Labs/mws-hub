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
    category: "utilities",
    audience: "Employees",
    keywords: [],
    href: "https://example.test",
    external: true,
    status: "active",
    discoverable: true,
    allowedSources: ["public"],
    ...extra,
  }) as HubCatalogEntry;

let own: HubCatalogEntry[] = [];

mock.module("../service/application-service", () => ({
  ApplicationService: { listActive: async () => own },
}));

const { AppsService, setApprovedAccessLookupForTest } = await import("../service/apps-service");
const { clearCentralCatalogCacheForTest } = await import("../service/central-catalog-service");
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

const published = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `App ${id}`,
  description: "Does things",
  icon: "Cash",
  category: "Operations",
  launch_url: `https://${id}.example.com/auth/sso`,
  logout_url: `https://${id}.example.com/auth/logout-silent`,
  ...extra,
});

beforeEach(() => {
  gate.clearAppAccessCacheForTest();
  clearCentralCatalogCacheForTest();
  own = [];
});

afterEach(() => {
  mock.restore();
});

describe("applications published in Central", () => {
  it("shows a published application to a person Central gives access, without a row in Hub", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("demo")] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);

    const card = (await AppsService.listFor(user)).find((app) => app.id === "demo");
    expect(card).toMatchObject({
      name: "App demo",
      icon: "Cash",
      category: "operations",
      href: "https://demo.example.com/auth/sso",
      access: "granted",
      ssoAppId: "demo",
    });
    expect(card).not.toHaveProperty("source");
    expect(card).not.toHaveProperty("sso");
  });

  it("leaves it out for a person Central gives no access", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("demo")] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    expect((await AppsService.listFor(user)).some((app) => app.id === "demo")).toBe(false);
  });

  it("leaves it out when Central cannot answer the access question", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("demo")] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockRejectedValue(new Error("down"));
    expect((await AppsService.listFor(user)).some((app) => app.id === "demo")).toBe(false);
  });

  it("lets a row in Hub with the same id win", async () => {
    own = [entry("demo", { name: "Hub's own name", centralEntitlementAppId: "demo" })];
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("demo")] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);

    const cards = (await AppsService.listFor(user)).filter((app) => app.id === "demo");
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("Hub's own name");
  });

  it("falls back to a category Hub knows", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("a", { category: "Finance" }),
      published("b", { category: null }),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const cards = await AppsService.listFor(user);
    expect(cards.find((app) => app.id === "a")?.category).toBe("utilities");
    expect(cards.find((app) => app.id === "b")?.category).toBe("utilities");
  });

  it("reads Central once a minute and keeps the last answer when Central is down", async () => {
    const list = spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("demo")] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    await AppsService.listFor(user);
    await AppsService.listFor(user);
    expect(list).toHaveBeenCalledTimes(1);

    // Past the cache time Central fails, the card stays.
    const realNow = Date.now;
    Date.now = () => realNow() + 61_000;
    try {
      list.mockRejectedValue(new Error("down"));
      expect((await AppsService.listFor(user)).some((app) => app.id === "demo")).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it("shows nothing from Central when it has never answered, and Hub's own apps still work", async () => {
    own = [entry("plain")];
    spyOn(centralClient, "listPublishedApplications").mockRejectedValue(new Error("down"));
    expect((await AppsService.listFor(user)).map((app) => app.id)).toEqual(["plain"]);
  });

  it("shows a plain link as a link, without a sign-in handoff, and still by access in Central", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("guide", { launch_mode: "link", logout_url: null })] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const card = (await AppsService.listFor(user)).find((app) => app.id === "guide");
    expect(card).toMatchObject({ href: "https://guide.example.com/auth/sso", access: "granted" });
    expect(card).not.toHaveProperty("ssoAppId");
    const found = await AppsService.findByLaunchId("guide");
    expect(found?.sso).toBeUndefined();
    expect(found?.centralEntitlementAppId).toBe("guide");

    // Nobody without access in Central sees it.
    gate.clearAppAccessCacheForTest();
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    expect((await AppsService.listFor(user)).some((app) => app.id === "guide")).toBe(false);
  });

  it("opens the launch flow and the logout fan-out for a published application", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("demo")] as never);
    const found = await AppsService.findByLaunchId("demo");
    expect(found?.sso).toMatchObject({
      appId: "demo",
      entryUrl: "https://demo.example.com/auth/sso",
      centralEntitlementAppId: "demo",
    });
    expect(await AppsService.canLaunch(found!, user)).toBe(true);
    expect(await AppsService.logoutTargets()).toContain("https://demo.example.com/auth/logout-silent");
  });
});
