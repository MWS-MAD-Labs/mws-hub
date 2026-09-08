import type {
  EmployeeLookupResponse,
  HubUser,
  StudentLookupResponse,
} from "../type/central-type";
import { logger } from "./logger";

const BASE_URL = process.env.CENTRAL_API_BASE_URL;
const TOKEN = process.env.CENTRAL_API_TOKEN;

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

function daysUntilBirthday({ month, day }: MonthDay, today = new Date()): number {
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

function namedRefIdOf(record: {
  [key: string]: unknown;
}, snakeKey: string, camelKey: string, objectKey: string): string | null {
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

async function lookup<T>(path: string, email: string): Promise<T | null> {
  const res = await fetch(`${BASE_URL}${path}?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    logger.error(`Central lookup failed (${path}):`, res.status, await res.text());
    throw new Error(`Central lookup failed with status ${res.status}`);
  }

  const body = (await res.json()) as { data: T };
  return body.data;
}

async function listPage<T>(path: string): Promise<CentralPage<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) {
    logger.error(`Central list failed (${path}):`, res.status, await res.text());
    throw new Error(`Central list failed with status ${res.status}`);
  }

  return (await res.json()) as CentralPage<T>;
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
// records. Employee is checked first since most Hub sign-ins are staff.
export async function resolveCentralIdentity(email: string): Promise<HubUser | null> {
  const employee = await lookup<EmployeeLookupResponse>("/employees/lookup", email);
  if (employee) {
    return normalizeEmployee(employee);
  }

  const student = await lookup<StudentLookupResponse>("/students/lookup", email);
  if (student) {
    const unitId = unitIdOf(student);
    return {
      source: "student",
      ...student,
      unit_id: unitId,
      unitId: unitId,
    };
  }

  return null;
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
    .filter((birthday): birthday is CentralBirthdayResponse => Boolean(birthday))
    .sort(
      (a, b) =>
        a.days_until - b.days_until || a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}
