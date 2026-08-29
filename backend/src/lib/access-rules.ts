import type { CentralClaim, HubUser } from "../type/central-type";

export type AccessRuleOption = {
  value: string;
  label: string;
  hint: string;
};

export const BASE_ACCESS_RULE_OPTIONS: AccessRuleOption[] = [
  {
    value: "public",
    label: "Semua pengguna Central",
    hint: "Karyawan dan siswa aktif yang bisa login ke Hub.",
  },
  {
    value: "employee",
    label: "Semua karyawan",
    hint: "Semua identity dengan source employee dari Central.",
  },
  {
    value: "student",
    label: "Semua siswa",
    hint: "Semua identity dengan source student dari Central.",
  },
];

export const CENTRAL_RULE_PREFIXES: AccessRuleOption[] = [
  {
    value: "unit:",
    label: "Unit ID",
    hint: "Contoh: unit:cmsh7trcj000a40lsm0w7tl4h.",
  },
  {
    value: "job-position:",
    label: "Job Position ID",
    hint: "Gunakan ID job position dari Central.",
  },
  {
    value: "job-position-label:",
    label: "Job Position",
    hint: "Fallback bila Central belum mengirim job_position_id.",
  },
  {
    value: "job-level:",
    label: "Job Level ID",
    hint: "Gunakan ID job level dari Central.",
  },
  {
    value: "job-level-label:",
    label: "Job Level",
    hint: "Fallback bila Central belum mengirim job_level_id.",
  },
  {
    value: "role:",
    label: "Role claim",
    hint: "Gunakan role claim yang dikirim Central, jika ada.",
  },
  {
    value: "permission:",
    label: "Permission claim",
    hint: "Gunakan permission claim yang dikirim Central, jika ada.",
  },
];

const VALID_PREFIXES = CENTRAL_RULE_PREFIXES.map((option) => option.value);

export function normalizeAccessToken(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9:]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidAccessRule(rule: string): boolean {
  const trimmed = rule.trim();
  if (!trimmed) return false;
  if (["public", "employee", "student"].includes(trimmed)) return true;
  if (["source:employee", "source:student"].includes(trimmed)) return true;
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(trimmed)) return true;

  return VALID_PREFIXES.some(
    (prefix) => trimmed.startsWith(prefix) && trimmed.length > prefix.length,
  );
}

function claimToStrings(claim: CentralClaim): string[] {
  if (typeof claim === "string") return [claim];

  return [
    claim.name,
    claim.slug,
    claim.key,
    claim.code,
    claim.role,
    claim.permission,
  ].filter((value): value is string => Boolean(value));
}

function addClaim(values: Set<string>, value: string | null | undefined) {
  if (!value) return;

  const normalized = normalizeAccessToken(value);
  if (!normalized) return;

  values.add(normalized);
  normalized
    .split("-")
    .filter(Boolean)
    .forEach((token) => values.add(token));
}

function namedValue(
  value: string | { name?: string | null } | null | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value.name || null;
  return null;
}

function normalizedClaims(
  claims: Array<CentralClaim | null | undefined>,
): Set<string> {
  const values = new Set<string>();

  claims.forEach((claim) => {
    if (!claim) return;
    claimToStrings(claim).forEach((value) => addClaim(values, value));
  });

  return values;
}

function unitIdOf(user: HubUser): string | null {
  if (user.source !== "employee") return user.unitId || user.unit_id || null;
  return user.unitId || user.unit_id || null;
}

function employeeFieldId(
  user: HubUser,
  snakeKey: "job_position_id" | "job_level_id",
  camelKey: "jobPositionId" | "jobLevelId",
): string | null {
  if (user.source !== "employee") return null;
  return user[camelKey] || user[snakeKey] || null;
}

export function userMatchesAccessRule(rule: string, user: HubUser): boolean {
  const normalizedRule = normalizeAccessToken(rule);
  if (!normalizedRule) return false;

  if (normalizedRule === "public") return true;
  if (normalizedRule === user.source || normalizedRule === `source:${user.source}`) {
    return true;
  }

  if (normalizedRule.startsWith("unit:")) {
    return unitIdOf(user) === rule.slice("unit:".length).trim();
  }

  if (normalizedRule.startsWith("job-position:")) {
    return (
      employeeFieldId(user, "job_position_id", "jobPositionId") ===
      rule.slice("job-position:".length).trim()
    );
  }

  if (normalizedRule.startsWith("job-position-label:")) {
    return (
      normalizeAccessToken(namedValue(user.source === "employee" ? user.job_position : null) || "") ===
      normalizeAccessToken(rule.slice("job-position-label:".length))
    );
  }

  if (normalizedRule.startsWith("job-level:")) {
    return (
      employeeFieldId(user, "job_level_id", "jobLevelId") ===
      rule.slice("job-level:".length).trim()
    );
  }

  if (normalizedRule.startsWith("job-level-label:")) {
    return (
      normalizeAccessToken(namedValue(user.source === "employee" ? user.job_level : null) || "") ===
      normalizeAccessToken(rule.slice("job-level-label:".length))
    );
  }

  const roles = normalizedClaims([
    user.role,
    ...(user.roles || []),
  ]);
  const permissions = normalizedClaims(user.permissions || []);

  if (normalizedRule.startsWith("role:")) {
    return roles.has(normalizeAccessToken(rule.slice("role:".length)));
  }

  if (normalizedRule.startsWith("permission:")) {
    return permissions.has(normalizeAccessToken(rule.slice("permission:".length)));
  }

  if (user.source === "student") return false;

  const centralIdentityLabels = normalizedClaims([
    user.role,
    ...(user.roles || []),
    ...(user.permissions || []),
  ]);

  [
    namedValue(user.unit),
    namedValue(user.job_position),
    namedValue(user.job_level),
    user.employment_type,
  ].forEach((value) => addClaim(centralIdentityLabels, value));

  return centralIdentityLabels.has(normalizedRule);
}
