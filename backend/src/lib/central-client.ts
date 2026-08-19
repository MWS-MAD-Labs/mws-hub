import type {
  EmployeeLookupResponse,
  HubUser,
  StudentLookupResponse,
} from "../type/central-type";
import { logger } from "./logger";

const BASE_URL = process.env.CENTRAL_API_BASE_URL;
const TOKEN = process.env.CENTRAL_API_TOKEN;

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
  if (employee) return { source: "employee", ...employee };

  const student = await lookup<StudentLookupResponse>("/students/lookup", email);
  if (student) return { source: "student", ...student };

  return null;
}
