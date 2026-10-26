import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";

let stored: Record<string, unknown> | null = null;

mock.module("../lib/prisma", () => ({
  prisma: {
    application: {
      findUnique: async () => null,
      findFirst: async ({ where }: { where: Record<string, unknown> }) => ("deleted_at" in where ? stored : null),
      aggregate: async () => ({ _max: { sort_order: 0 } }),
      create: async ({ data }: { data: Record<string, unknown> }) => data,
      update: async ({ data }: { data: Record<string, unknown> }) => data,
    },
  },
}));

// Query string loads the real module even where other tests mock it.
// @ts-expect-error bun resolves the query string, tsc does not
const { ApplicationService } = (await import("../service/application-service.ts?central-address")) as typeof import("../service/application-service");
const { clearCentralCatalogCacheForTest } = await import("../service/central-catalog-service");

const row = {
  id: "learnspace",
  sso_app_id: "learnspace",
  sso_entry_url: "http://localhost:3001/api/auth/sso",
  sso_logout_url: null,
  sso_central_entitlement_app_id: null,
};

const input = (extra: Record<string, unknown> = {}) => ({
  name: "Learnspace",
  category: "operations",
  audience: "Staff",
  description: "x",
  href: "http://localhost:3002",
  allowedSources: ["employee" as const],
  ssoAppId: "learnspace",
  ssoEntryUrl: "http://localhost:3001/api/auth/sso",
  centralEntitlementAppId: "learnspace",
  ...extra,
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as { status: number; message: string };
  }
  return null;
}

function centralPublishes() {
  clearCentralCatalogCacheForTest();
  spyOn(centralClient, "listPublishedApplications").mockResolvedValue([
    { id: "learnspace", name: "Learnspace", launch_url: "http://localhost:3002/api/v1/auth/sso", launch_mode: "sso" },
  ] as never);
  spyOn(centralClient, "listCentralApplicationIds").mockResolvedValue(["learnspace", "mtss"]);
}

afterEach(() => {
  mock.restore();
  clearCentralCatalogCacheForTest();
  stored = null;
});

describe("the sign-in address of an application Central publishes", () => {
  it("cannot be changed from Hub, while the rest of the row can", async () => {
    stored = { ...row };
    centralPublishes();
    const refused = await failure(ApplicationService.update("learnspace", input({ ssoEntryUrl: "http://localhost:3009/auth/sso" })));
    expect(refused?.status).toBe(400);
    expect(refused?.message).toContain("Central owns the sign-in address");
    expect(await failure(ApplicationService.update("learnspace", input({ name: "Learnspace Hub" })))).toBeNull();
  });

  it("does not ask Central when the address is left as it is", async () => {
    stored = { ...row, sso_central_entitlement_app_id: "learnspace" };
    clearCentralCatalogCacheForTest();
    const published = spyOn(centralClient, "listPublishedApplications");
    expect(await failure(ApplicationService.update("learnspace", input({ name: "Learnspace Hub" })))).toBeNull();
    expect(published).not.toHaveBeenCalled();
  });

  it("cannot be set when a row is added for it", async () => {
    centralPublishes();
    expect((await failure(ApplicationService.create(input({ id: "learnspace", ssoEntryUrl: "http://localhost:3009/auth/sso" }))))?.status).toBe(400);
  });

  it("is free for an application Central does not publish", async () => {
    stored = { ...row, id: "mtss", sso_app_id: "mtss" };
    centralPublishes();
    expect(await failure(ApplicationService.update("mtss", input({ ssoAppId: "mtss", centralEntitlementAppId: "mtss", ssoEntryUrl: "http://localhost:5176/mtss/auth/sso" })))).toBeNull();
  });
});
