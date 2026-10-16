import { describe, it, expect } from "bun:test";
import { userMatchesAccessRule } from "../lib/access-rules";
import type { HubUser } from "../type/central-type";

function employee(overrides: Partial<HubUser> = {}): HubUser {
  return {
    source: "employee",
    id: "emp-1",
    employee_id: "44.44.444",
    full_name: "Dummy Staff",
    nick_name: null,
    email: "dummystaff@millennia21.id",
    photo_url: null,
    unit: "Elementary",
    job_position: "Special Education Teacher",
    job_level: "SE Teacher",
    status: "ACTIVE",
    employment_type: "PERMANENT",
    is_teaching_role: true,
    ...overrides,
  } as HubUser;
}

describe("userMatchesAccessRule - teaching-role", () => {
  it("admits an employee whose Central job level is flagged is_teaching_role, regardless of the specific title", () => {
    const seTeacher = employee({ job_level: "SE Teacher", is_teaching_role: true });
    expect(userMatchesAccessRule("teaching-role", seTeacher)).toBe(true);
  });

  it("rejects an employee whose job level is not flagged as teaching", () => {
    const supportStaff = employee({ job_level: "Support Staff", is_teaching_role: false });
    expect(userMatchesAccessRule("teaching-role", supportStaff)).toBe(false);
  });

  it("does not admit a student, even if the field were somehow present", () => {
    const student = {
      source: "student",
      id: "stu-1",
      nis: "123",
      nisn: null,
      full_name: "A Student",
      nick_name: null,
      email: "student@millennia21.id",
      status: "ACTIVE",
      current_grade: "Grade 5",
      current_class: "Grade 5 - Orion",
    } as HubUser;
    expect(userMatchesAccessRule("teaching-role", student)).toBe(false);
  });

  it("still matches the old job-level-label style rule for exact-name lists (unaffected by this change)", () => {
    const teacher = employee({ job_level: "Teacher", is_teaching_role: true });
    expect(userMatchesAccessRule("teacher", teacher)).toBe(true);
  });
});

describe("userMatchesAccessRule - interns", () => {
  const intern = {
    source: "intern",
    id: "int-1",
    person_id: "per-1",
    full_name: "An Intern",
    nick_name: null,
    email: "intern@millennia21.id",
    photo_url: null,
    unit: "Elementary",
    unit_id: "unit-1",
    job_position: "Teaching Intern",
    job_position_id: "pos-1",
    status: "ACTIVE",
  } as HubUser;

  it("admits an intern on the intern and public rules", () => {
    expect(userMatchesAccessRule("intern", intern)).toBe(true);
    expect(userMatchesAccessRule("source:intern", intern)).toBe(true);
    expect(userMatchesAccessRule("public", intern)).toBe(true);
  });

  it("does not admit an intern on the employee or student rules", () => {
    expect(userMatchesAccessRule("employee", intern)).toBe(false);
    expect(userMatchesAccessRule("student", intern)).toBe(false);
  });

  it("does not admit an employee on the intern rule", () => {
    expect(userMatchesAccessRule("intern", employee())).toBe(false);
  });

  it("does not admit an intern on a teaching-role rule", () => {
    expect(userMatchesAccessRule("teaching-role", intern)).toBe(false);
  });
});
