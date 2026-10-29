import { afterEach, describe, expect, it, mock } from "bun:test";
import type { HubUser } from "../type/central-type";

mock.module("../lib/prisma", () => ({
  prisma: {
    accessRequest: { findMany: async () => [] },
  },
}));

mock.module("../service/application-service", () => ({
  ApplicationService: { listActive: async () => [] },
}));

mock.module("../service/central-catalog-service", () => ({
  centralCatalogState: async () => ({ read: false, entries: [], known: null }),
  isWithdrawn: () => false,
}));

mock.module("../lib/hub-access-gate", () => ({
  centralAccessForApp: async () => "unknown",
}));

const { AppsService } = await import("../service/apps-service");

function employee(): HubUser {
  return {
    source: "employee",
    id: "employee-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "MAD Labs User",
    nick_name: null,
    email: "madlabs@millennia21.id",
    photo_url: null,
    unit: "MAD Labs",
    unit_id: "unit-mad-labs",
    unitId: "unit-mad-labs",
    job_position: null,
    job_level: null,
    status: "ACTIVE",
    employment_type: null,
  };
}

afterEach(() => mock.restore());

describe("native GPT Code catalog card", () => {
  it("stays visible and openable for staff when Central publishes no catalog", async () => {
    const catalog = await AppsService.listFor(employee());
    expect(catalog).toContainEqual(expect.objectContaining({
      id: "gpt-code",
      name: "GPT Code",
      href: "/gpt-code",
      access: "granted",
      discoverable: true,
    }));
  });

  it("can be resolved by the normal Hub launch route", async () => {
    await expect(AppsService.findByLaunchId("gpt-code")).resolves.toMatchObject({
      id: "gpt-code",
      source: "hub",
    });
  });
});
