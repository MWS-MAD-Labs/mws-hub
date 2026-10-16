import type { CentralClaim, HubUser } from "../type/central-type";

export type AccessRuleOption = {
  value: string;
  label: string;
  hint: string;
};

export const BASE_ACCESS_RULE_OPTIONS: AccessRuleOption[] = [
  {
    value: "public",
    // "Public" here means "no restriction beyond a successful Google +
    // Central sign-in" (the union of employee + student), never "reachable
    // without logging in" - by the time this rule is evaluated, Hub's own
    // session middleware already required a valid session. Label/hint spell
    // this out explicitly since "public" alone reads like the opposite in
    // most security contexts.
    label: "Semua anggota Central (tetap wajib login)",
    hint: "Karyawan, intern dan siswa aktif yang berhasil login Google + ketemu di Central - bukan akses tanpa login/terbuka ke publik internet. Gabungan dari \"Semua karyawan\" + \"Semua intern\" + \"Semua siswa\".",
  },
  {
    value: "employee",
    label: "Semua karyawan",
    hint: "Semua identity dengan source employee dari Central.",
  },
  {
    value: "intern",
    label: "Semua intern",
    hint: "Semua identity dengan source intern dari Central.",
  },
  {
    value: "student",
    label: "Semua siswa",
    hint: "Semua identity dengan source student dari Central.",
  },
  {
    value: "teaching-role",
    label: "Semua role mengajar (is_teaching_role)",
    hint: "Karyawan yang job level-nya ditandai is_teaching_role di Central - Teacher, SE Teacher, dan job level mengajar lain, tanpa perlu daftar nama job level manual.",
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
  if (["public", "employee", "intern", "student"].includes(trimmed)) return true;
  if (["source:employee", "source:intern", "source:student"].includes(trimmed)) return true;
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

// Whole-value only, deliberately never split on "-" into sub-word claims -
// see the matching comment on apps-service.ts's addAccessTag (the token-
// derivation twin of this function, used for the relay token's `tags`
// rather than Hub's own access decision here) for why: a compound label
// can be a broader role that should admit a narrower rule just as easily as
// a distinct, unrelated one that only shares a word, and the string alone
// can't tell those apart.
function addClaim(values: Set<string>, value: string | null | undefined) {
  if (!value) return;

  const normalized = normalizeAccessToken(value);
  if (!normalized) return;

  values.add(normalized);
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

// Employees have a job position and a job level, interns a job position only.
function employeeFieldId(
  user: HubUser,
  snakeKey: "job_position_id" | "job_level_id",
  camelKey: "jobPositionId" | "jobLevelId",
): string | null {
  if (user.source === "employee") return user[camelKey] || user[snakeKey] || null;
  if (user.source === "intern" && snakeKey === "job_position_id") return user.jobPositionId || user.job_position_id || null;
  return null;
}

export function userMatchesAccessRule(rule: string, user: HubUser): boolean {
  const normalizedRule = normalizeAccessToken(rule);
  if (!normalizedRule) return false;

  if (normalizedRule === "public") return true;
  if (normalizedRule === user.source || normalizedRule === `source:${user.source}`) {
    return true;
  }

  // Central's own "does this job level actually teach" signal - checked
  // directly rather than via a job-level/position name list, so a new
  // teaching job level (or one an app's rules were never updated for)
  // gets in automatically. Only employees carry this field.
  if (normalizedRule === "teaching-role") {
    return user.source === "employee" && user.is_teaching_role === true;
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
      normalizeAccessToken(namedValue(user.source === "student" ? null : user.job_position) || "") ===
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
    user.source === "employee" ? namedValue(user.job_level) : null,
    user.source === "employee" ? user.employment_type : null,
  ].forEach((value) => addClaim(centralIdentityLabels, value));

  return centralIdentityLabels.has(normalizedRule);
}
