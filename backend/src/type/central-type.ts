export type CentralClaim =
  | string
  | {
      name?: string | null;
      slug?: string | null;
      key?: string | null;
      code?: string | null;
      role?: string | null;
      permission?: string | null;
    };

export type CentralAccessClaims = {
  role?: string | null;
  roles?: CentralClaim[] | null;
  permissions?: CentralClaim[] | null;
};

export type CentralUnitRef = {
  id?: string | null;
  name?: string | null;
};

export type CentralNamedRef = {
  id?: string | null;
  name?: string | null;
};

export type EmployeeLookupResponse = {
  id: string;
  // Person.id - the one id space shared with the student side, and what
  // mintRelayToken() now puts in a relay token's `sub` claim instead of
  // email. `id` above (Employee.id) stays what resolveCentralIdentityById
  // re-verifies sessions by - a different, employee-table-scoped id.
  person_id: string;
  employee_id: string;
  full_name: string;
  nick_name: string | null;
  email: string;
  photo_url: string | null;
  unit: string | CentralUnitRef | null;
  unit_id?: string | null;
  unitId?: string | null;
  job_position: string | CentralNamedRef | null;
  job_position_id?: string | null;
  jobPositionId?: string | null;
  job_level: string | CentralNamedRef | null;
  job_level_id?: string | null;
  jobLevelId?: string | null;
  // Central's own job_level.is_teaching_role flag - the same signal
  // mws-mtss-system/mws-daily-checkin gate teacher-vs-staff on (see their
  // jobLevelRoleMapping.js). Gating MTSS access on this instead of a
  // hand-picked job_level/position name list means a new teaching job
  // level (or one this catalog entry's rules were never updated for, e.g.
  // "SE Teacher") gets in automatically instead of needing a matching
  // access-rule edit every time Central adds one.
  is_teaching_role?: boolean;
  birth_date?: string | null;
  date_of_birth?: string | null;
  dob?: string | null;
  birthday?: string | null;
  status: string;
  employment_type: string | null;
} & CentralAccessClaims;

export type StudentLookupResponse = {
  id: string;
  // Person.id - see the matching note in EmployeeLookupResponse.
  person_id: string;
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
} & CentralAccessClaims;

// An intern has a unit and a job position. There is no employee ID, job level or employment type.
export type InternLookupResponse = {
  id: string;
  // Person.id, what the entitlements and the shared session know the person by.
  person_id: string;
  full_name: string;
  nick_name: string | null;
  email: string;
  photo_url: string | null;
  unit: string | CentralUnitRef | null;
  unit_id?: string | null;
  unitId?: string | null;
  job_position: string | CentralNamedRef | null;
  job_position_id?: string | null;
  jobPositionId?: string | null;
  building?: string | null;
  join_date?: string | null;
  end_date?: string | null;
  status: string;
} & CentralAccessClaims;

export type AdminLookupResponse = {
  id: string;
  admin_no: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  unit_id: string | null;
  job_position: string | null;
  job_position_id: string | null;
  job_level?: string | CentralNamedRef | null;
  job_level_id: string | null;
  building?: string | CentralNamedRef | null;
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
} & CentralAccessClaims;

export type HubUser =
  | ({ source: "employee" } & EmployeeLookupResponse)
  | ({ source: "intern" } & InternLookupResponse)
  | ({ source: "student" } & StudentLookupResponse)
  | ({ source: "admin" } & AdminLookupResponse);

export type HubSource = HubUser["source"];

export type CentralApplicationEntitlement = {
  id: string;
  person_id: string;
  application_id: string;
  organization_id: string;
  role: string;
  permissions: string[];
  version: number;
  is_active: boolean;
  granted_at: string;
  updated_at: string;
};

export type RelayEntitlement = Pick<
  CentralApplicationEntitlement,
  "id" | "application_id" | "organization_id" | "role" | "permissions" | "version"
>;
