import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
import { isHubAdmin } from "../lib/admin-access";
import { clearHubAccessCacheForTest } from "../lib/hub-access-gate";
import type { CentralApplicationEntitlement, HubUser } from "../type/central-type";

const user = {
  source: "employee",
  id: "emp-1",
  person_id: "person-1",
  employee_id: "15.26.905",
  full_name: "MAD Labs User",
  nick_name: null,
  email: "mad@millennia21.id",
  photo_url: null,
  unit: "MAD Lab",
  unit_id: "unit-mad",
  job_position: "Developer",
  job_level: "Staff",
  status: "ACTIVE",
  employment_type: "PERMANENT",
} as HubUser;

const entitlement = (permissions: string[]): CentralApplicationEntitlement =>
  ({
    id: "group:rule-1",
    person_id: "person-1",
    application_id: "hub",
    organization_id: "org-1",
    role: "STAFF",
    permissions,
    is_active: true,
    version: 1,
  }) as CentralApplicationEntitlement;

const KEYS = ["HUB_CENTRAL_ACCESS_MODE", "HUB_CENTRAL_ACCESS_BYPASS_EMAILS", "HUB_ADMIN_FALLBACK"] as const;

beforeEach(() => clearHubAccessCacheForTest());
afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("isHubAdmin", () => {
  it("is admin only when the role in Central carries hub.admin, in every mode", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(entitlement(["hub.use", "hub.admin"]));
    for (const mode of ["off", "warn", "enforce"]) {
      process.env.HUB_CENTRAL_ACCESS_MODE = mode;
      clearHubAccessCacheForTest();
      expect(await isHubAdmin(user)).toBe(true);
    }
  });

  it("is not admin with a staff role, even in the MAD Labs unit", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(entitlement(["hub.use"]));
    for (const mode of ["off", "warn", "enforce"]) {
      process.env.HUB_CENTRAL_ACCESS_MODE = mode;
      clearHubAccessCacheForTest();
      expect(await isHubAdmin(user)).toBe(false);
    }
  });

  it("ignores the old MAD Labs fallback setting", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    process.env.HUB_ADMIN_FALLBACK = "mad-labs";
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    expect(await isHubAdmin(user)).toBe(false);
  });

  it("is not admin without access in Central, and for nobody", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    expect(await isHubAdmin(user)).toBe(false);
    expect(await isHubAdmin(null)).toBe(false);
  });

  it("makes an emergency account admin only while Central gives it no access or cannot be reached", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    process.env.HUB_CENTRAL_ACCESS_BYPASS_EMAILS = "MAD@millennia21.id";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    expect(await isHubAdmin(user)).toBe(true);

    lookup.mockRejectedValue(new Error("down"));
    clearHubAccessCacheForTest();
    expect(await isHubAdmin(user)).toBe(true);

    lookup.mockResolvedValue(entitlement(["hub.use"]));
    clearHubAccessCacheForTest();
    expect(await isHubAdmin(user)).toBe(false);

    lookup.mockResolvedValue(entitlement(["hub.use", "hub.admin"]));
    clearHubAccessCacheForTest();
    expect(await isHubAdmin(user)).toBe(true);
  });
});
