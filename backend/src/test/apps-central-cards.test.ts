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
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    expect((await AppsService.listFor(user)).some((app) => app.id === "daily-checkin")).toBe(false);
  });

  it("leaves the card open when Central gives access", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const card = (await AppsService.listFor(user)).find((app) => app.id === "daily-checkin");
    expect(card?.access).toBe("granted");
  });

  it("keeps the maintenance status on a card the person can open", async () => {
    spyOn(centralClient, "listPublishedApplications").mockResolvedValue([published("daily-checkin", { status: "maintenance" })] as never);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    const card = (await AppsService.listFor(user))[0];
    expect(card.status).toBe("maintenance");
    expect(card.access).toBe("granted");
  });

  it("shows nothing but what Central publishes", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({ is_active: true } as never);
    expect((await AppsService.listFor(user)).map((app) => app.id)).toEqual(["daily-checkin"]);
  });
});
