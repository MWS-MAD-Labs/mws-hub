import { listActiveEmployees } from "../lib/central-client";
import type { AccessRuleOption } from "../lib/access-rules";

export type CentralAccessRuleOptions = {
  units: AccessRuleOption[];
  jobPositions: AccessRuleOption[];
  jobLevels: AccessRuleOption[];
  buildings: AccessRuleOption[];
};

// An active employee as an admin screen offers them: to pick a person by name.
export type CentralPerson = { email: string; name: string; unit: string | null };

type ActiveEmployee = Awaited<ReturnType<typeof listActiveEmployees>>[number];

function byLabel(a: AccessRuleOption, b: AccessRuleOption) {
  return a.label.localeCompare(b.label);
}

function addOption(
  map: Map<string, AccessRuleOption>,
  value: string | null | undefined,
  label: string | null | undefined,
  hint: string,
) {
  if (!value || !label) return;
  if (map.has(value)) return;
  map.set(value, { value, label, hint });
}

function labelOf(value: string | { name?: string | null } | null | undefined): string | null {
  if (typeof value === "string") return value;
  return value?.name || null;
}

function optionsFrom(employees: ActiveEmployee[]): CentralAccessRuleOptions {
  const units = new Map<string, AccessRuleOption>();
  const jobPositions = new Map<string, AccessRuleOption>();
  const jobLevels = new Map<string, AccessRuleOption>();
  const buildings = new Map<string, AccessRuleOption>();

  for (const employee of employees) {
    const unit = labelOf(employee.unit);
    const jobPosition = labelOf(employee.job_position);
    const jobLevel = labelOf(employee.job_level);

    addOption(
      units,
      employee.unit_id ? `unit:${employee.unit_id}` : null,
      unit,
      `Central unit_id: ${employee.unit_id}`,
    );

    addOption(
      jobPositions,
      employee.job_position_id
        ? `job-position:${employee.job_position_id}`
        : jobPosition
          ? `job-position-label:${jobPosition}`
          : null,
      jobPosition,
      employee.job_position_id
        ? `Central job_position_id: ${employee.job_position_id}`
        : "Central job_position name.",
    );

    addOption(
      jobLevels,
      employee.job_level_id
        ? `job-level:${employee.job_level_id}`
        : jobLevel
          ? `job-level-label:${jobLevel}`
          : null,
      jobLevel,
      employee.job_level_id
        ? `Central job_level_id: ${employee.job_level_id}`
        : "Central job_level name.",
    );

    // Id only: a building is matched by Central's building_id, never by name.
    addOption(
      buildings,
      employee.building_id ? `building:${employee.building_id}` : null,
      labelOf(employee.building),
      `Central building_id: ${employee.building_id}`,
    );
  }

  return {
    units: [...units.values()].sort(byLabel),
    jobPositions: [...jobPositions.values()].sort(byLabel),
    jobLevels: [...jobLevels.values()].sort(byLabel),
    buildings: [...buildings.values()].sort(byLabel),
  };
}

function peopleFrom(employees: ActiveEmployee[]): CentralPerson[] {
  const byEmail = new Map<string, CentralPerson>();
  for (const employee of employees) {
    const email = employee.email?.trim().toLowerCase();
    if (!email || byEmail.has(email)) continue;
    byEmail.set(email, { email, name: employee.full_name?.trim() || email, unit: labelOf(employee.unit) });
  }
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export class CentralDirectoryService {
  static async accessRuleOptions(): Promise<CentralAccessRuleOptions> {
    return optionsFrom(await listActiveEmployees());
  }

  // Rule options and the people they come from, from one read of Central.
  static async directory(): Promise<{ options: CentralAccessRuleOptions; people: CentralPerson[] }> {
    const employees = await listActiveEmployees();
    return { options: optionsFrom(employees), people: peopleFrom(employees) };
  }
}
