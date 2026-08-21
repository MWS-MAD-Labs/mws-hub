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

export type EmployeeLookupResponse = {
  id: string;
  employee_id: string;
  full_name: string;
  nick_name: string | null;
  email: string;
  photo_url: string | null;
  unit: string | null;
  job_position: string | null;
  job_level: string | null;
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
} & CentralAccessClaims;

export type HubUser =
  | ({ source: "employee" } & EmployeeLookupResponse)
  | ({ source: "student" } & StudentLookupResponse);
