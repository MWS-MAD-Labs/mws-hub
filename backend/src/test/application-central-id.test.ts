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
const { ApplicationService } = (await import("../service/application-service.ts?central-id")) as typeof import("../service/application-service");

const input = (centralEntitlementAppId?: string) => ({
  name: "Exima",
  category: "operations",
  audience: "Staff",
  description: "x",
  href: "https://exima.test",
  allowedSources: ["employee" as const],
  ssoAppId: "exima",
  ssoEntryUrl: "https://exima.test/sso",
  centralEntitlementAppId,
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as { status: number; message: string };
  }
  return null;
}

afterEach(() => {
  mock.restore();
  stored = null;
});

describe("Central application id on save", () => {
  it("accepts an id Central knows", async () => {
    spyOn(centralClient, "listCentralApplicationIds").mockResolvedValue(["exima", "hub"]);
    expect(await failure(ApplicationService.create(input("exima")))).toBeNull();
  });

  it("rejects an id Central does not know", async () => {
    spyOn(centralClient, "listCentralApplicationIds").mockResolvedValue(["hub"]);
    const error = await failure(ApplicationService.create(input("exmia")));
    expect(error?.status).toBe(400);
    expect(error?.message).toContain('Central has no application "exmia"');
  });

  it("refuses to guess when Central cannot be reached", async () => {
    spyOn(centralClient, "listCentralApplicationIds").mockRejectedValue(new Error("down"));
    expect((await failure(ApplicationService.create(input("exima"))))?.status).toBe(503);
  });

  it("requires a Central application id for new applications", async () => {
    expect((await failure(ApplicationService.create(input())))?.status).toBe(400);
  });

  it("does not ask again on update when the id did not change", async () => {
    stored = { id: "exima", sso_central_entitlement_app_id: "exima" };
    const list = spyOn(centralClient, "listCentralApplicationIds");
    await ApplicationService.update("exima", input("exima"));
    expect(list).not.toHaveBeenCalled();
  });
});
