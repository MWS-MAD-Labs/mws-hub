import type { AuthUser } from "@/model/auth-model";

export const MAD_LABS_UNIT_ID = "cmsh7trcj000a40lsm0w7tl4h";

const MAD_LABS_UNIT_NAMES = new Set(["mad-lab", "mad-labs"]);

function normalizeUnitName(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unitNameOf(user: AuthUser | null | undefined): string | null {
  if (!user || user.source !== "employee") return null;
  return user.unit || null;
}

export function getUserUnitId(
  user: AuthUser | null | undefined,
): string | null {
  if (!user || user.source !== "employee") return null;
  return (
    user.unitId ||
    user.unit_id ||
    (MAD_LABS_UNIT_NAMES.has(normalizeUnitName(unitNameOf(user)))
      ? MAD_LABS_UNIT_ID
      : null)
  );
}

export function isMadLabsUser(user: AuthUser | null | undefined): boolean {
  return getUserUnitId(user) === MAD_LABS_UNIT_ID;
}
