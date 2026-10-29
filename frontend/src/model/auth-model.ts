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

export type InternIdentity = {
  source: "intern";
  id: string;
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
  status: string;
  isAdmin?: boolean;
};

export type AdminIdentity = {
  source?: "admin";
  id: string;
  admin_no: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  unit_id: string | null;
  unitId?: string | null;
  job_position: string | null;
  job_position_id: string | null;
  job_level: string | { id?: string | null; name?: string | null } | null;
  job_level_id: string | null;
  building: string | { id?: string | null; name?: string | null } | null;
  building_id: string | null;
  education_level: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  type: "admin";
  is_protected: boolean;
  is_identifier_change_approver: boolean;
  is_employee_identifier_change_approver: boolean;
  is_head_of_care: boolean;
  person_id: string;
  isAdmin?: boolean;
};

// What the backend's /auth/google and /auth/me hand back - a Central DB
// employee, intern or student record, whichever resolveCentralIdentity() matched.
export type AuthUser = EmployeeIdentity | InternIdentity | StudentIdentity | AdminIdentity;

export function toHubUser(user: AuthUser): HubUser {
  return {
    name: ("nick_name" in user ? user.nick_name : null) || user.full_name,
    email: user.email,
    role:
      "type" in user
        ? user.role
        : user.source === "employee"
          ? user.job_position || "Staff"
          : user.source === "intern"
            ? user.job_position || "Intern"
            : "Student",
  };
}
