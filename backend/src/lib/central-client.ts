import { failureForNetwork, failureForResponse } from "./central-failure";
import type {
  CentralApplicationEntitlement,
  EmployeeLookupResponse,
  HubUser,
  StudentLookupResponse,
} from "../type/central-type";
import { logger } from "./logger";

// Read when used, not once at load, so tests (and a late-set env) see the real value.
const baseUrl = () => process.env.CENTRAL_API_BASE_URL;
const apiToken = () => process.env.CENTRAL_API_TOKEN;

// Without this, a Central that's slow (not fully down/erroring) hangs
// sign-in, launch(), and the admin middleware indefinitely - the existing
// fail-closed handling below only triggers on a thrown error, never on a
// plain hang. Same 5s budget as session-revocation.ts's satellite-app calls.
const CALL_TIMEOUT_MS = 5000;

type CentralPage<T> = {
  success?: boolean;
  data: T[];
  paging?: {
    current_page: number;
    total_page: number;
  };
};

export type CentralBirthdayResponse = {
  id: string;
  name: string;
  nick_name: string | null;
  photo_url: string | null;
  unit: string | null;
  birthday: string;
  days_until: number;
  is_today: boolean;
};

type MonthDay = {
  month: number;
  day: number;
};

function unitIdOf(record: {
  unit_id?: string | null;
  unitId?: string | null;
  unit?: string | { id?: string | null } | null;
}): string | null {
  if (record.unit_id) return record.unit_id;
  if (record.unitId) return record.unitId;
  if (record.unit && typeof record.unit === "object" && record.unit.id) {
    return record.unit.id;
  }

  return null;
}

function unitNameOf(record: {
  unit?: string | { name?: string | null } | null;
}): string | null {
  if (typeof record.unit === "string") return record.unit;
  if (record.unit && typeof record.unit === "object") {
    return record.unit.name || null;
  }

  return null;
}

function birthdayValueOf(employee: EmployeeLookupResponse): string | null {
  return (
    employee.birth_date ||
    employee.date_of_birth ||
    employee.dob ||
    employee.birthday ||
    null
  );
}

function monthDayOf(value: string): MonthDay | null {
  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    return {
      month: Number(dateOnlyMatch[2]),
      day: Number(dateOnlyMatch[3]),
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

function daysUntilBirthday(
  { month, day }: MonthDay,
  today = new Date(),
): number {
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  let nextBirthdayUtc = Date.UTC(today.getFullYear(), month - 1, day);

  if (nextBirthdayUtc < todayUtc) {
    nextBirthdayUtc = Date.UTC(today.getFullYear() + 1, month - 1, day);
  }

  return Math.round((nextBirthdayUtc - todayUtc) / 86_400_000);
}

function namedRefNameOf(
  value: string | { name?: string | null } | null | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.name || null;
  return null;
}

function namedRefIdOf(
  record: {
    [key: string]: unknown;
  },
  snakeKey: string,
  camelKey: string,
  objectKey: string,
): string | null {
  const snakeValue = record[snakeKey];
  if (typeof snakeValue === "string" && snakeValue) return snakeValue;

  const camelValue = record[camelKey];
  if (typeof camelValue === "string" && camelValue) return camelValue;

  const objectValue = record[objectKey];
  if (
    objectValue &&
    typeof objectValue === "object" &&
    "id" in objectValue &&
    typeof objectValue.id === "string" &&
    objectValue.id
  ) {
    return objectValue.id;
  }

  return null;
}

async function lookup<T>(
  path: string,
  query: Record<string, string>,
): Promise<T | null> {
  const params = new URLSearchParams(query);
  const res = await fetch(`${baseUrl()}${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${apiToken()}` },
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    logger.error(
      `Central lookup failed (${path}):`,
      res.status,
      await res.text(),
    );
    throw new Error(`Central lookup failed with status ${res.status}`);
  }

  const body = (await res.json()) as { data: T };
  return body.data;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseApplicationEntitlement(
  value: unknown,
  personId: string,
  applicationId: string,
): CentralApplicationEntitlement {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Central entitlement response data is invalid");
  }

  const data = value as Record<string, unknown>;
  const permissions = data.permissions;
  const valid =
    isNonEmptyString(data.id) &&
    data.person_id === personId &&
    data.application_id === applicationId &&
    isNonEmptyString(data.organization_id) &&
    isNonEmptyString(data.role) &&
    Array.isArray(permissions) &&
    permissions.every((permission) => isNonEmptyString(permission)) &&
    typeof data.version === "number" &&
    Number.isInteger(data.version) &&
    data.version >= 0 &&
    typeof data.is_active === "boolean" &&
    isNonEmptyString(data.granted_at) &&
    !Number.isNaN(Date.parse(data.granted_at)) &&
    isNonEmptyString(data.updated_at) &&
    !Number.isNaN(Date.parse(data.updated_at));

  if (!valid) throw new Error("Central entitlement response data is invalid");
  return data as CentralApplicationEntitlement;
}

export async function lookupApplicationEntitlement(
  personId: string,
  applicationId: string,
): Promise<CentralApplicationEntitlement | null> {
  const data = await lookup<unknown>("/application-entitlements/lookup", {
    person_id: personId,
    application_id: applicationId,
  });
  return data === null
    ? null
    : parseApplicationEntitlement(data, personId, applicationId);
}

// Ids of the applications set up in Central's Application Access.
export async function listCentralApplicationIds(): Promise<string[]> {
  const data = await lookup<unknown>("/application-entitlements/applications", {});
  if (!Array.isArray(data) || !data.every((id) => typeof id === "string")) {
    throw new Error("Central application list response data is invalid");
  }
  return data;
}

// An application Central published for the Hub.
export type CentralPublishedApplication = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  scope?: string | null;
  launch_url: string;
  logout_url: string | null;
  // sso: opened through the sign-in handoff. link: a plain address. Older Central versions send neither.
  launch_mode?: "sso" | "link";
};

export async function listPublishedApplications(): Promise<CentralPublishedApplication[]> {
  const data = await lookup<unknown>("/applications", {});
  if (!Array.isArray(data)) throw new Error("Central published applications response is invalid");
  return data.filter((item): item is CentralPublishedApplication => {
    const row = item as Partial<CentralPublishedApplication> | null;
    return Boolean(row && isNonEmptyString(row.id) && isNonEmptyString(row.name) && isNonEmptyString(row.launch_url));
  });
}

// The categories (kind of tool) and scopes (product space) Central keeps as master data.
export type CentralTaxonomy = {
  categories: { key: string; name: string }[];
  scopes: { key: string; name: string }[];
};

const isNamedKey = (item: unknown): item is { key: string; name: string } => {
  const row = item as { key?: unknown; name?: unknown } | null;
  return Boolean(row && isNonEmptyString(row.key) && isNonEmptyString(row.name));
};

export async function getCentralTaxonomy(): Promise<CentralTaxonomy> {
  const data = await lookup<{ categories?: unknown; scopes?: unknown }>("/application-taxonomy", {});
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.scopes)) {
    throw new Error("Central taxonomy response is invalid");
  }
  return { categories: data.categories.filter(isNamedKey), scopes: data.scopes.filter(isNamedKey) };
}

export type PermissionManifestEntry = { key: string; description?: string; requires?: string[] };
export type RegisteredPermission = {
  key: string;
  description: string | null;
  requires: string[];
  source: "MANIFEST" | "MANUAL";
  deprecated: boolean;
};
export type PermissionSyncResult = {
  application_id: string;
  total: number;
  added: number;
  deprecated: string[];
  affected_roles: { role: string; permissions: string[] }[];
};

async function permissionCall<T>(path: string, init: { method: "GET" | "PUT"; body?: unknown } = { method: "GET" }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/application-permissions${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${apiToken()}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch (error) {
    throw failureForNetwork(error);
  }
  const body = (await res.json().catch(() => null)) as { data?: T; errors?: string } | null;
  if (!res.ok) throw failureForResponse(res.status, body?.errors);
  return body?.data as T;
}

// Sent on deploy: what Hub's code understands. The token has to be the API client made for Hub.
export function publishPermissions(applicationId: string, permissions: PermissionManifestEntry[], confirmRemovals = false) {
  return permissionCall<PermissionSyncResult>(`/${encodeURIComponent(applicationId)}`, {
    method: "PUT",
    body: { permissions, confirm_removals: confirmRemovals || undefined },
  });
}

export function listRegisteredPermissions(applicationId: string) {
  return permissionCall<RegisteredPermission[]>(`/${encodeURIComponent(applicationId)}`);
}

export function permissionUsage(applicationId: string) {
  return permissionCall<string[]>(`/${encodeURIComponent(applicationId)}/usage`);
}

async function listPage<T>(path: string): Promise<CentralPage<T>> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${apiToken()}` },
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });

  if (!res.ok) {
    logger.error(
      `Central list failed (${path}):`,
      res.status,
      await res.text(),
    );
    throw new Error(`Central list failed with status ${res.status}`);
  }

  return (await res.json()) as CentralPage<T>;
}

// Central's /persons/lookup response shape - collapses the employee-then-
// student fallback resolveCentralIdentity used to do into one HTTP call.
type PersonLookupResponse =
  | ({ source: "employee" } & EmployeeLookupResponse)
  | ({ source: "student" } & StudentLookupResponse);

function normalizeStudent(
  student: StudentLookupResponse,
): Extract<HubUser, { source: "student" }> {
  const unitId = unitIdOf(student);
  return {
    source: "student",
    ...student,
    unit_id: unitId,
    unitId: unitId,
  };
}

function normalizeEmployee(
  employee: EmployeeLookupResponse,
): Extract<HubUser, { source: "employee" }> {
  const unitName = unitNameOf(employee);
  const unitId = unitIdOf(employee);
  const jobPositionId = namedRefIdOf(
    employee,
    "job_position_id",
    "jobPositionId",
    "job_position",
  );
  const jobLevelId = namedRefIdOf(
    employee,
    "job_level_id",
    "jobLevelId",
    "job_level",
  );

  return {
    source: "employee",
    ...employee,
    unit: unitName,
    unit_id: unitId,
    unitId: unitId,
    job_position: namedRefNameOf(employee.job_position),
    job_position_id: jobPositionId,
    jobPositionId: jobPositionId,
    job_level: namedRefNameOf(employee.job_level),
    job_level_id: jobLevelId,
    jobLevelId: jobLevelId,
  };
}

// Resolves who just signed in with Google against Central's employee/student
// records, in one call to /persons/lookup instead of the old
// employee-then-student fallback (which cost every student sign-in a wasted
// 404 round-trip to /employees/lookup first). Central itself decides which
// side wins if a Person somehow has both an Employee and a Student record
// (Person.employee/Person.student are both optional 1:1 - nothing stops both
// existing at once) - confirmed with the product owner that MWS has no real
// dual-role people, so this never needs to surface a choice. If that ever
// changes, this is the place a "pick which role" step would need to go, not
// downstream in Hub's session/token shape.
// Email is the only identifier available at this point - Google hands back
// an email, not a Central id - so this is the one place in Hub that has to
// look someone up by it. Everywhere else that already knows someone's
// Central id (a re-check on an existing session) should prefer
// resolveCentralIdentityById below instead, which stays on the precise
// per-source endpoint since it already knows which one to ask.
export async function resolveCentralIdentity(
  email: string,
): Promise<HubUser | null> {
  const person = await lookup<PersonLookupResponse>("/persons/lookup", {
    email,
  });
  if (!person) return null;

  return person.source === "employee"
    ? normalizeEmployee(person)
    : normalizeStudent(person);
}

// Re-resolves someone Hub already identified once, by Central's own stable
// id instead of email - email is editable in Central (see
// EmployeeValidation.UPDATE server-side), so a row/lookup keyed by it
// silently breaks the moment someone's email changes there. `source` is
// required because Central exposes separate employee/student lookup
// endpoints - the caller already knows which one from the session it's
// re-checking, so this skips /persons/lookup entirely and goes straight to
// the precise endpoint, unlike resolveCentralIdentity above which doesn't
// know the source yet.
export async function resolveCentralIdentityById(
  id: string,
  source: "employee" | "student",
): Promise<HubUser | null> {
  if (source === "employee") {
    const employee = await lookup<EmployeeLookupResponse>("/employees/lookup", {
      id,
    });
    return employee ? normalizeEmployee(employee) : null;
  }

  const student = await lookup<StudentLookupResponse>("/students/lookup", {
    id,
  });
  return student ? normalizeStudent(student) : null;
}

export async function listActiveEmployees(): Promise<
  Array<Extract<HubUser, { source: "employee" }>>
> {
  const employees: Array<Extract<HubUser, { source: "employee" }>> = [];
  let page = 1;
  let totalPage = 1;

  do {
    const body = await listPage<EmployeeLookupResponse>(
      `/employees?page=${page}&size=100&status=ACTIVE`,
    );
    employees.push(...body.data.map(normalizeEmployee));
    totalPage = body.paging?.total_page ?? page;
    page += 1;
  } while (page <= totalPage);

  return employees;
}

export async function listUpcomingEmployeeBirthdays(
  limit = 8,
): Promise<CentralBirthdayResponse[]> {
  const employees = await listActiveEmployees();

  return employees
    .map((employee) => {
      const birthday = birthdayValueOf(employee);
      const monthDay = birthday ? monthDayOf(birthday) : null;
      if (!birthday || !monthDay) return null;

      const daysUntil = daysUntilBirthday(monthDay);

      return {
        id: employee.id,
        name: employee.nick_name || employee.full_name,
        nick_name: employee.nick_name,
        photo_url: employee.photo_url,
        unit: unitNameOf(employee),
        birthday,
        days_until: daysUntil,
        is_today: daysUntil === 0,
      };
    })
    .filter((birthday): birthday is CentralBirthdayResponse =>
      Boolean(birthday),
    )
    .sort((a, b) => a.days_until - b.days_until || a.name.localeCompare(b.name))
    .slice(0, limit);
}
