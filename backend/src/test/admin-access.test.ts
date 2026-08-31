import { afterEach, describe, expect, it } from "bun:test";
import {
  clearMadLabsUnitIdCacheForTest,
  isMadLabsUser,
  madLabsUnitId,
} from "../lib/admin-access";
import type { HubUser } from "../type/central-type";

const TEST_MAD_LABS_UNIT_ID = "cmsr1gmkh000akz7bzjgdv6dq";
const originalFetch = global.fetch;

afterEach(() => {
  clearMadLabsUnitIdCacheForTest();
  global.fetch = originalFetch;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockCentralEmployees(unitId = TEST_MAD_LABS_UNIT_ID) {
  global.fetch = (async () =>
    jsonResponse(200, {
      success: true,
      data: [
        {
          id: "emp-1",
          employee_id: "15.26.905",
          full_name: "MAD Labs User",
          nick_name: "MAD",
          email: "mad@millennia21.id",
          photo_url: null,
          unit: "MAD Lab",
          unit_id: unitId,
          job_position: "Developer",
          job_level: "Staff",
          status: "ACTIVE",
          employment_type: "PROBATION",
        },
      ],
      paging: { current_page: 1, total_page: 1 },
    })) as unknown as typeof fetch;
}

function employee(overrides: Partial<Extract<HubUser, { source: "employee" }>> = {}): HubUser {
  return {
    source: "employee",
    id: "emp-1",
    employee_id: "15.26.905",
    full_name: "MAD Labs User",
    nick_name: "MAD",
    email: "mad@millennia21.id",
    photo_url: null,
    unit: null,
    job_position: "Developer",
    job_level: "Staff",
    status: "ACTIVE",
    employment_type: "PROBATION",
    ...overrides,
  };
}

describe("isMadLabsUser", () => {
  it("loads the MAD Labs unit id from Central employees", async () => {
    mockCentralEmployees();

    expect(await madLabsUnitId()).toBe(TEST_MAD_LABS_UNIT_ID);
  });

  it("admits an employee whose Central unit_id matches the MAD Labs id from Central", async () => {
    mockCentralEmployees();

    expect(await isMadLabsUser(employee({ unit_id: TEST_MAD_LABS_UNIT_ID }))).toBe(true);
  });

  it("admits an employee whose Central unitId matches the MAD Labs id from Central", async () => {
    mockCentralEmployees();

    expect(await isMadLabsUser(employee({ unitId: TEST_MAD_LABS_UNIT_ID }))).toBe(true);
  });

  it("does not admit a user from name alone when Central did not send a unit id", async () => {
    mockCentralEmployees();

    expect(await isMadLabsUser(employee({ unit: "MAD Lab", unit_id: null, unitId: null }))).toBe(false);
  });

  it("refuses non-MAD Labs employees and students", async () => {
    mockCentralEmployees();

    expect(await isMadLabsUser(employee({ unit_id: "unit-junior-high" }))).toBe(false);
    expect(
      await isMadLabsUser({
        source: "student",
        id: "stu-1",
        nis: null,
        nisn: null,
        full_name: "Student",
        nick_name: null,
        email: "student@millennia21.id",
        status: "ACTIVE",
        current_grade: null,
        current_class: null,
      }),
    ).toBe(false);
  });
});
