import { describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";

mock.module("../lib/prisma", () => ({
  prisma: {
    application: {
      findUnique: async () => null,
      findFirst: async () => null,
      aggregate: async () => ({ _max: { sort_order: 0 } }),
      create: async ({ data }: { data: Record<string, unknown> }) => data,
    },
  },
}));

// @ts-expect-error bun resolves the query string, tsc does not
const { ApplicationService } = (await import("../service/application-service.ts?coming-soon")) as typeof import("../service/application-service");

describe("coming soon applications", () => {
  it("accepts coming_soon without a launch URL", async () => {
    spyOn(centralClient, "listCentralApplicationIds").mockResolvedValue(["future-tool"]);
    const result = await ApplicationService.create({
      name: "Future Tool",
      category: "utilities",
      audience: "Staff",
      description: "Coming later",
      status: "coming_soon",
      href: null,
      allowedSources: ["employee"],
      centralEntitlementAppId: "future-tool",
    });

    expect(result.status).toBe("COMING_SOON");
    expect(result.href).toBeNull();
  });
});
