import type { HubUser } from "./hub-model";

export type EmployeeIdentity = {
  source: "employee";
  id: string;
  employee_id: string;
  full_name: string;
  nick_name: string | null;
  email: string;
  photo_url: string | null;
  unit: string | null;
  unit_id?: string | null;
  unitId?: string | null;
  job_position: string | null;
  job_position_id?: string | null;
  jobPositionId?: string | null;
  job_level: string | null;
  job_level_id?: string | null;
  jobLevelId?: string | null;
  status: string;
  employment_type: string | null;
  isAdmin?: boolean;
};

export type StudentIdentity = {
  source: "student";
  id: string;
  nis: string | null;
  nisn: string | null;
  full_name: string;
  nick_name: string | null;
  email: string;
  status: string;
  current_grade: string | null;
  current_class: string | null;
  unit_id?: string | null;
  unitId?: string | null;
  isAdmin?: boolean;
};

// What the backend's /auth/google and /auth/me hand back - a Central DB
// employee or student record, whichever resolveCentralIdentity() matched.
export type AuthUser = EmployeeIdentity | StudentIdentity;

export function toHubUser(user: AuthUser): HubUser {
  return {
    name: user.nick_name || user.full_name,
    email: user.email,
    role: user.source === "employee" ? user.job_position || "Staff" : "Student",
  };
}
