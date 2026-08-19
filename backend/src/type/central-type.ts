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
};

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
};

export type HubUser =
  | ({ source: "employee" } & EmployeeLookupResponse)
  | ({ source: "student" } & StudentLookupResponse);
