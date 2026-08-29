import type {
  EmployeeLookupResponse,
  HubUser,
  StudentLookupResponse,
} from "../type/central-type";
import { knownUnitIdForUnitName } from "./admin-access";
import { logger } from "./logger";

const BASE_URL = process.env.CENTRAL_API_BASE_URL;
const TOKEN = process.env.CENTRAL_API_TOKEN;

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

// Resolves who just signed in with Google against Central's employee/student
// records. Employee is checked first since most Hub sign-ins are staff.
export async function resolveCentralIdentity(email: string): Promise<HubUser | null> {
  const employee = await lookup<EmployeeLookupResponse>("/employees/lookup", email);
  if (employee) {
    const unitName = unitNameOf(employee);
    const unitId = unitIdOf(employee) || knownUnitIdForUnitName(unitName);
    return {
      source: "employee",
      ...employee,
      unit: unitName,
      unit_id: unitId,
      unitId: unitId,
    };
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
