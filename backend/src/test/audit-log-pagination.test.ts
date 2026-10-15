import { afterEach, describe, expect, it, mock } from "bun:test";

const countCalls: unknown[] = [];
const findCalls: unknown[] = [];
const auditRow = {
  id: "log-1",
  actor_email: "admin@millennia21.id",
  actor_name: "Admin",
  action: "application.update",
  entity_type: "application",
  entity_id: "student-central",
  summary: "Updated Student Central",
  metadata: null,
  created_at: new Date("2026-10-07T00:00:00.000Z"),
};

mock.module("../lib/prisma", () => ({
  prisma: {
    auditLog: {
      count: (args: unknown) => {
        countCalls.push(args);
        return Promise.resolve(123);
      },
      findMany: (args: unknown) => {
        findCalls.push(args);
        return Promise.resolve([auditRow]);
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  },
}));

const { listAuditLogs } = await import("../service/audit-log-service");

afterEach(() => {
  countCalls.length = 0;
  findCalls.length = 0;
});

describe("audit log pagination", () => {
  it("returns a stable page and total", async () => {
    const result = await listAuditLogs({ page: 3, pageSize: 25 });

    expect(result.total).toBe(123);
    expect(result.rows).toEqual([auditRow]);
    expect(findCalls[0]).toEqual({
      where: {},
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: 50,
      take: 25,
    });
  });

  it("applies action and case-insensitive text filters to count and rows", async () => {
    await listAuditLogs({ page: 1, pageSize: 50, q: "maya", action: "application.update" });

    const expectedWhere = {
      action: "application.update",
      OR: [
        { actor_email: { contains: "maya", mode: "insensitive" } },
        { actor_name: { contains: "maya", mode: "insensitive" } },
        { action: { contains: "maya", mode: "insensitive" } },
        { entity_type: { contains: "maya", mode: "insensitive" } },
        { entity_id: { contains: "maya", mode: "insensitive" } },
        { summary: { contains: "maya", mode: "insensitive" } },
      ],
    };
    expect(countCalls[0]).toEqual({ where: expectedWhere });
    expect(findCalls[0]).toEqual({
      where: expectedWhere,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip: 0,
      take: 50,
    });
  });

  it("applies an exclusive Jakarta date range to count and rows", async () => {
    const dateFrom = new Date("2026-10-06T17:00:00.000Z");
    const dateToExclusive = new Date("2026-10-08T17:00:00.000Z");
    await listAuditLogs({ page: 1, pageSize: 10, dateFrom, dateToExclusive });
    const expectedWhere = { created_at: { gte: dateFrom, lt: dateToExclusive } };
    expect(countCalls[0]).toEqual({ where: expectedWhere });
    expect(findCalls[0]).toEqual({ where: expectedWhere, orderBy: [{ created_at: "desc" }, { id: "desc" }], skip: 0, take: 10 });
  });
});
