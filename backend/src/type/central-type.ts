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
  status: string;
  employment_type: string | null;
} & CentralAccessClaims;

export type StudentLookupResponse = {
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
} & CentralAccessClaims;

export type HubUser =
  | ({ source: "employee" } & EmployeeLookupResponse)
  | ({ source: "student" } & StudentLookupResponse);
