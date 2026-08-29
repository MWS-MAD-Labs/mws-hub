import { beforeAll, describe, expect, it } from "bun:test";
import { isMadLabsUser, madLabsUnitId } from "../lib/admin-access";
import type { HubUser } from "../type/central-type";

const TEST_MAD_LABS_UNIT_ID = "cmsh7trcj000a40lsm0w7tl4h";

beforeAll(() => {
  process.env.MAD_LABS_UNIT_ID = TEST_MAD_LABS_UNIT_ID;
});

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
  it("admits an employee whose Central unit_id matches MAD Labs", () => {
    expect(madLabsUnitId()).toBe(TEST_MAD_LABS_UNIT_ID);
    expect(isMadLabsUser(employee({ unit_id: TEST_MAD_LABS_UNIT_ID }))).toBe(true);
  });

  it("admits an employee whose Central unitId matches MAD Labs", () => {
    expect(isMadLabsUser(employee({ unitId: TEST_MAD_LABS_UNIT_ID }))).toBe(true);
  });

  it("does not infer MAD Labs access from the display unit name", () => {
    expect(isMadLabsUser(employee({ unit: "MAD Lab", unit_id: null, unitId: null }))).toBe(false);
  });

  it("refuses non-MAD Labs employees and students", () => {
    expect(isMadLabsUser(employee({ unit: "Junior High" }))).toBe(false);
    expect(
      isMadLabsUser({
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
