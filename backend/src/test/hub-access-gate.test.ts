import { describe, it, expect, spyOn, afterEach, beforeEach, mock } from "bun:test";
import * as centralClient from "../lib/central-client";
import type { CentralApplicationEntitlement, HubUser } from "../type/central-type";

const audits: { action: string }[] = [];

mock.module("../lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: async ({ data }: { data: { action: string } }) => {
        audits.push(data);
        return data;
      },
    },
  },
}));

const gate = await import("../lib/hub-access-gate");
const { ResponseError } = await import("../error/response-error");

const user: HubUser = {
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
};

const entitlement = (extra: Partial<CentralApplicationEntitlement> = {}): CentralApplicationEntitlement => ({
  id: "group:rule-1",
  person_id: "person-1",
  application_id: "hub",
  organization_id: "org_hub_abc",
  role: "MEMBER",
  permissions: ["hub.use"],
  version: 1_790_000_000,
  is_active: true,
  granted_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
  ...extra,
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as InstanceType<typeof ResponseError>;
  }
  return null;
}

beforeEach(() => {
  gate.clearHubAccessCacheForTest();
  audits.length = 0;
  delete process.env.HUB_CENTRAL_ACCESS_BYPASS_EMAILS;
  delete process.env.HUB_CENTRAL_ACCESS_APP_ID;
});

afterEach(() => {
  mock.restore();
  delete process.env.HUB_CENTRAL_ACCESS_MODE;
});

describe("Hub access gate at sign-in", () => {
  it("does not ask Central when the mode is off or unset", async () => {
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement");
    await gate.enforceHubAccessOnLogin(user);
    process.env.HUB_CENTRAL_ACCESS_MODE = "nonsense";
    await gate.enforceHubAccessOnLogin(user);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("lets someone with active access in, also when it comes from a group", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(entitlement());
    await gate.enforceHubAccessOnLogin(user);
    expect(lookup).toHaveBeenCalledWith("person-1", "hub");
  });

  it("turns away someone without access, or with revoked access, and records it", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    const none = await failure(gate.enforceHubAccessOnLogin(user));
    expect(none?.status).toBe(403);
    expect(none?.code).toBe("hub_access_denied");

    gate.clearHubAccessCacheForTest();
    lookup.mockResolvedValue(entitlement({ is_active: false }));
    expect((await failure(gate.enforceHubAccessOnLogin(user)))?.code).toBe("hub_access_denied");
    expect(audits.map((entry) => entry.action)).toEqual(["hub.login_denied", "hub.login_denied"]);
  });

  it("lets everyone in while warning, but writes down who would be turned away", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "warn";
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    await gate.enforceHubAccessOnLogin(user);
    expect(audits.map((entry) => entry.action)).toEqual(["hub.login_would_deny"]);
  });

  it("fails closed when Central cannot be reached in enforce mode, open in warn mode", async () => {
    spyOn(centralClient, "lookupApplicationEntitlement").mockRejectedValue(new Error("down"));
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    const refused = await failure(gate.enforceHubAccessOnLogin(user));
    expect(refused?.status).toBe(503);
    expect(refused?.code).toBe("central_unavailable");

    process.env.HUB_CENTRAL_ACCESS_MODE = "warn";
    await gate.enforceHubAccessOnLogin(user);
  });

  it("always lets the bypass accounts in, without asking Central", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    process.env.HUB_CENTRAL_ACCESS_BYPASS_EMAILS = " Someone@x.id , EMPLOYEE@millennia21.id ";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    await gate.enforceHubAccessOnLogin(user);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("asks Central once for a person within a minute and can use another application id", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    process.env.HUB_CENTRAL_ACCESS_APP_ID = "hub-portal";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(entitlement({ application_id: "hub-portal" }));
    await gate.enforceHubAccessOnLogin(user);
    await gate.enforceHubAccessOnLogin(user);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("person-1", "hub-portal");
  });
});

describe("Hub access gate for a session", () => {
  it("only checks in enforce mode", async () => {
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    process.env.HUB_CENTRAL_ACCESS_MODE = "warn";
    await gate.ensureHubAccessForSession(user);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("signs out someone whose access was removed, and not during a Central outage", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);
    const removed = await failure(gate.ensureHubAccessForSession(user));
    expect(removed?.status).toBe(401);

    gate.clearHubAccessCacheForTest();
    lookup.mockRejectedValue(new Error("down"));
    await gate.ensureHubAccessForSession(user);
  });
});

describe("Hub admin from Central permission", () => {
  const { isHubAdmin } = require("../lib/admin-access") as typeof import("../lib/admin-access");

  afterEach(() => {
    delete process.env.HUB_ADMIN_FALLBACK;
  });

  it("is admin when the role carries hub.admin", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(
      entitlement({ role: "ADMIN", permissions: ["hub.use", "hub.admin"] }),
    );
    expect(await isHubAdmin(user)).toBe(true);
  });

  it("is not admin with a member role and no unit to fall back on", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(entitlement());
    expect(await isHubAdmin(user)).toBe(false);
  });

  it("does not ask Central when the mode is off", async () => {
    const lookup = spyOn(centralClient, "lookupApplicationEntitlement");
    expect(await isHubAdmin(user)).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("ignores the MAD Labs fallback when HUB_ADMIN_FALLBACK is off", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    process.env.HUB_ADMIN_FALLBACK = "off";
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(entitlement());
    expect(await isHubAdmin({ ...user, unit_id: "u-mad" } as HubUser)).toBe(false);
  });

  it("is false for no user", async () => {
    expect(await isHubAdmin(null)).toBe(false);
  });
});
