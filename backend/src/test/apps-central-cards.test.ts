import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
import type { HubUser } from "../type/central-type";

const { AppsService, setApprovedAccessLookupForTest } = await import("../service/apps-service");
const gate = await import("../lib/hub-access-gate");
const { clearCentralCatalogCacheForTest } = await import("../service/central-catalog-service");

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
  name: id,
  description: "",
  icon: null,
  category: null,
  launch_url: `https://${id}.example.com/auth/sso`,
  logout_url: null,
  ...extra,
});

// A spy, not a module mock: a module mock would stay for the test files after this one.
beforeEach(() => {
  gate.clearAppAccessCacheForTest();
  clearCentralCatalogCacheForTest();
  spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("daily-checkin")] as never);
});

afterEach(() => {
  mock.restore();
});

describe("cards for apps published in Central", () => {
  it("leaves the card out when the person has no access in Central", async () => {
    spyOn(centralClient, "lookupApplicationEntitlements").mockResolvedValue([]);
    expect((await AppsService.listFor(user)).some((app) => app.id === "daily-checkin")).toBe(false);
  });

  it("leaves the card open when Central gives access", async () => {
    spyOn(centralClient, "lookupApplicationEntitlements").mockResolvedValue([
      { application_id: "daily-checkin", is_active: true } as never,
    ]);
    const card = (await AppsService.listFor(user)).find((app) => app.id === "daily-checkin");
    expect(card?.access).toBe("granted");
  });

  it("keeps the maintenance status on a card the person can open", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("daily-checkin", { status: "maintenance" })] as never);
    spyOn(centralClient, "lookupApplicationEntitlements").mockResolvedValue([
      { application_id: "daily-checkin", is_active: true } as never,
    ]);
    const card = (await AppsService.listFor(user))[0];
    expect(card.status).toBe("maintenance");
    expect(card.access).toBe("granted");
  });

  it("shows nothing but what Central publishes", async () => {
    spyOn(centralClient, "lookupApplicationEntitlements").mockResolvedValue([
      { application_id: "daily-checkin", is_active: true } as never,
    ]);
    expect((await AppsService.listFor(user)).map((app) => app.id)).toEqual(["daily-checkin"]);
  });

  it("checks all published cards in one Central request", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("daily-checkin"),
      published("mtss"),
    ] as never);
    const lookup = spyOn(
      centralClient,
      "lookupApplicationEntitlements",
    ).mockResolvedValue([
      { application_id: "daily-checkin", is_active: true } as never,
      { application_id: "mtss", is_active: true } as never,
    ]);

    expect((await AppsService.listFor(user)).map((app) => app.id)).toEqual([
      "daily-checkin",
      "mtss",
    ]);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("person-1", [
      "daily-checkin",
      "mtss",
    ]);
  });

  it("falls back to individual lookups while Central is being deployed", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("daily-checkin"),
      published("mtss"),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlements").mockRejectedValue(
      Object.assign(
        new Error("Central batch entitlement lookup failed with status 404"),
        { status: 404 },
      ),
    );
    const lookup = spyOn(
      centralClient,
      "lookupApplicationEntitlement",
    ).mockImplementation(async (_personId, appId) =>
      appId === "daily-checkin"
        ? ({ application_id: appId, is_active: true } as never)
        : null,
    );

    expect((await AppsService.listFor(user)).map((app) => app.id)).toEqual([
      "daily-checkin",
    ]);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("keeps successful fallback results when one individual lookup fails", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
      published("daily-checkin"),
      published("mtss"),
    ] as never);
    spyOn(centralClient, "lookupApplicationEntitlements").mockRejectedValue(
      Object.assign(
        new Error("Central batch entitlement lookup failed with status 405"),
        { status: 405 },
      ),
    );
    spyOn(
      centralClient,
      "lookupApplicationEntitlement",
    ).mockImplementation(async (_personId, appId) => {
      if (appId === "mtss") throw new Error("down");
      return { application_id: appId, is_active: true } as never;
    });

    expect((await AppsService.listFor(user)).map((app) => app.id)).toEqual([
      "daily-checkin",
    ]);
  });
});

describe("when Central cannot be asked", () => {
  const limited = () => new centralClient.CentralRateLimitedError(12);
  const savedCache = process.env.HUB_CENTRAL_ACCESS_CACHE_SECONDS;
  const savedStale = process.env.HUB_CENTRAL_ACCESS_STALE_SECONDS;

  afterEach(() => {
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore("HUB_CENTRAL_ACCESS_CACHE_SECONDS", savedCache);
    restore("HUB_CENTRAL_ACCESS_STALE_SECONDS", savedStale);
  });

  it("says so, with the wait Central asked for, when a card cannot be checked", async () => {
    spyOn(centralClient, "lookupApplicationEntitlements").mockRejectedValue(limited());
    const answer = await AppsService.listWithStatus(user);
    expect(answer.apps).toEqual([]);
    expect(answer.unavailable).toEqual({ retryAfterSeconds: 12 });
  });

  it("keeps a card Central confirmed a moment ago, and does not call it a failure", async () => {
    process.env.HUB_CENTRAL_ACCESS_CACHE_SECONDS = "0";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlements");
    lookup.mockResolvedValueOnce([{ application_id: "daily-checkin", is_active: true } as never]);
    expect((await AppsService.listWithStatus(user)).apps.map((app) => app.id)).toEqual(["daily-checkin"]);

    lookup.mockRejectedValue(limited());
    const answer = await AppsService.listWithStatus(user);
    expect(answer.apps.map((app) => app.id)).toEqual(["daily-checkin"]);
    expect(answer.unavailable).toBeNull();
  });

  it("stops showing a card once the last confirmation is older than the stale limit", async () => {
    process.env.HUB_CENTRAL_ACCESS_CACHE_SECONDS = "0";
    process.env.HUB_CENTRAL_ACCESS_STALE_SECONDS = "0";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlements");
    lookup.mockResolvedValueOnce([{ application_id: "daily-checkin", is_active: true } as never]);
    await AppsService.listWithStatus(user);

    lookup.mockRejectedValue(limited());
    const answer = await AppsService.listWithStatus(user);
    expect(answer.apps).toEqual([]);
    expect(answer.unavailable).toEqual({ retryAfterSeconds: 12 });
  });

  it("does not call it a failure when Central answers that there is no access", async () => {
    spyOn(centralClient, "lookupApplicationEntitlements").mockResolvedValue([]);
    const answer = await AppsService.listWithStatus(user);
    expect(answer.apps).toEqual([]);
    expect(answer.unavailable).toBeNull();
  });

  it("asks the fallback only a few cards at a time", async () => {
    const ids = Array.from({ length: 12 }, (_, index) => `app-${index}`);
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue(ids.map((id) => published(id)) as never);
    spyOn(centralClient, "lookupApplicationEntitlements").mockRejectedValue(
      Object.assign(new Error("old Central"), { status: 404 }),
    );
    let running = 0;
    let peak = 0;
    spyOn(centralClient, "lookupApplicationEntitlement").mockImplementation(async (_personId, appId) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return { application_id: appId, is_active: true } as never;
    });
    expect((await AppsService.listWithStatus(user)).apps).toHaveLength(12);
    expect(peak).toBeLessThanOrEqual(5);
  });
});
