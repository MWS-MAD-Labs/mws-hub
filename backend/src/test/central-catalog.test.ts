import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
import { deriveAppSecret } from "../lib/hub-app-secret";
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

const { AppsService, setApprovedAccessLookupForTest } = await import("../service/apps-service");
const { centralTaxonomy, clearCentralCatalogCacheForTest } = await import("../service/central-catalog-service");
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

// A spy, not a module mock: a module mock would stay for the test files after this one.
beforeEach(() => {
  gate.clearAppAccessCacheForTest();
  clearCentralCatalogCacheForTest();
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

  it("takes the sign-in address from Central", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("learnspace", { launch_url: "http://localhost:3002/api/v1/auth/sso", logout_url: "http://localhost:3002/api/v1/auth/logout", launch_mode: "sso" }),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);

    const found = await AppsService.findByLaunchId("learnspace");
    expect(found?.sso?.entryUrl).toBe("http://localhost:3002/api/v1/auth/sso");
    expect(found?.sso?.logoutUrl).toBe("http://localhost:3002/api/v1/auth/logout");
    // Nothing else can add a card or an address: an id Central does not publish is unknown.
    expect(await AppsService.findByLaunchId("other")).toBeNull();
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

  it("uses the categories and scopes Central keeps, and keeps the scope on the card", async () => {
    spyOn(centralClient, "getCentralTaxonomy").mockResolvedValue({
      categories: [{ key: "clinic", name: "Clinic" }],
      scopes: [{ key: "carespace", name: "Carespace" }],
    });
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("a", { category: "clinic", scope: "carespace" }),
      published("b", { category: "reporting", scope: "nowhere" }),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const cards = await AppsService.listFor(user);
    expect(cards.find((app) => app.id === "a")).toMatchObject({ category: "clinic", scope: "carespace" });
    // A category Central no longer has falls back, an unknown scope is left off.
    const other = cards.find((app) => app.id === "b");
    expect(other?.category).toBe("utilities");
    expect(other?.scope).toBeUndefined();
    expect(await centralTaxonomy()).toEqual({
      categories: [{ key: "clinic", name: "Clinic" }],
      scopes: [{ key: "carespace", name: "Carespace" }],
    });
  });

  it("falls back to the lists Central starts with when it cannot be read", async () => {
    spyOn(centralClient, "getCentralTaxonomy").mockRejectedValue(new Error("down"));
    const taxonomy = await centralTaxonomy();
    expect(taxonomy.categories.map((item) => item.key)).toContain("utilities");
    expect(taxonomy.scopes.map((item) => item.key)).toContain("safespace");
  });

  it("tells each application's backend the secret that application uses, and keeps it off the cards", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("own-app", { logout_url: "https://own.example.com/auth/logout-silent", hub_secret: { mode: "own", version: 2 } }),
      published("old-app", { logout_url: "https://old.example.com/auth/logout-silent", hub_secret: { mode: "shared", version: 1 } }),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const targets = await AppsService.revokeSessionTargets("master-secret-0123456789abcdef");
    expect(targets).toEqual([
      { url: "https://own.example.com/auth/revoke-session", secret: deriveAppSecret("master-secret-0123456789abcdef", "own-app", 2) },
      { url: "https://old.example.com/auth/revoke-session", secret: "master-secret-0123456789abcdef" },
    ]);
    const cards = await AppsService.listFor(user);
    expect(JSON.stringify(cards)).not.toContain("hubSecret");
  });

  it("tells an application's backend the secret Central set for it", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("daily-checkin", { hub_secret: { mode: "own", version: 1 } }),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const targets = await AppsService.revokeSessionTargets("master-secret-0123456789abcdef");
    expect(targets).toEqual([
      {
        url: "https://daily-checkin.example.com/auth/revoke-session",
        secret: deriveAppSecret("master-secret-0123456789abcdef", "daily-checkin", 1),
      },
    ]);
  });

  it("keeps applications that read the Hub session out of the logout and revoke lists", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("shared-app", { session_mode: "shared", logout_url: "https://shared.example.com/auth/logout", hub_secret: { mode: "own", version: 1 } }),
      published("relay-app", { session_mode: "relay", logout_url: "https://relay.example.com/auth/logout", hub_secret: { mode: "own", version: 1 } }),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const targets = await AppsService.revokeSessionTargets("master-secret-0123456789abcdef");
    expect(targets.map((target) => target.url)).toEqual(["https://relay.example.com/auth/revoke-session"]);
    expect(await AppsService.logoutTargets()).toEqual(["https://relay.example.com/auth/logout-silent"]);
    const found = await AppsService.findByLaunchId("shared-app");
    expect(found?.sessionMode).toBe("shared");
    expect(JSON.stringify(await AppsService.listFor(user))).not.toContain("sessionMode");
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

  it("shows nothing when Central has never answered", async () => {
    spyOn(centralClient, "listPublishedApplications").mockRejectedValue(new Error("down"));
    expect(await AppsService.listFor(user)).toEqual([]);
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
