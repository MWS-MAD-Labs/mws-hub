import { afterEach, describe, expect, it, mock } from "bun:test";
import type { HubUser } from "../type/central-type";
import { HUB_CATALOG } from "./fixtures/hub-catalog";

const gptCodeFixture = HUB_CATALOG.find((entry) => entry.id === "gpt-code");
if (!gptCodeFixture) throw new Error("GPT Code fixture is missing");

const centralGptCodeEntry = {
  ...gptCodeFixture,
  allowedSources: [],
  centralEntitlementAppId: gptCodeFixture.id,
  source: "central" as const,
};

mock.module("../lib/prisma", () => ({
  prisma: {
    accessRequest: { findMany: async () => [] },
  },
}));

mock.module("../service/central-catalog-service", () => ({
  centralCatalogState: async () => ({
    read: true,
    entries: [centralGptCodeEntry],
  }),
}));

mock.module("../lib/hub-access-gate", () => ({
  centralAccessForApp: async () => "granted",
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

describe("Central GPT Code catalog card", () => {
  it("is visible and openable when Central publishes it and grants access", async () => {
    const catalog = await AppsService.listFor(employee());
    expect(catalog).toContainEqual(expect.objectContaining({
      id: "gpt-code",
      access: "granted",
      discoverable: true,
    }));
  });

  it("can be resolved by the normal Hub launch route", async () => {
    await expect(AppsService.findByLaunchId("gpt-code")).resolves.toMatchObject({
      id: "gpt-code",
      source: "central",
    });
  });
});
