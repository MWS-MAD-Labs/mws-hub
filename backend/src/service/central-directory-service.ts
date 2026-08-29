import { listActiveEmployees } from "../lib/central-client";
import type { AccessRuleOption } from "../lib/access-rules";

export type CentralAccessRuleOptions = {
  units: AccessRuleOption[];
  jobPositions: AccessRuleOption[];
  jobLevels: AccessRuleOption[];
};

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

export class CentralDirectoryService {
  static async accessRuleOptions(): Promise<CentralAccessRuleOptions> {
    const employees = await listActiveEmployees();
    const units = new Map<string, AccessRuleOption>();
    const jobPositions = new Map<string, AccessRuleOption>();
    const jobLevels = new Map<string, AccessRuleOption>();

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
    }

    return {
      units: [...units.values()].sort(byLabel),
      jobPositions: [...jobPositions.values()].sort(byLabel),
      jobLevels: [...jobLevels.values()].sort(byLabel),
    };
  }
}
