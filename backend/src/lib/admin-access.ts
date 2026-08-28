import type { HubUser } from "../type/central-type";

export const MAD_LABS_UNIT_ID = "cmsr1gmkh000akz7bzjgdv6dq";

const MAD_LABS_UNIT_NAMES = new Set(["mad-lab", "mad-labs"]);

function normalizeUnitName(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unitNameOf(user: HubUser): string | null {
  if (user.source !== "employee") return null;
  if (typeof user.unit === "string") return user.unit;
  return user.unit?.name || null;
}

export function knownUnitIdForUnitName(
  unitName: string | null | undefined,
): string | null {
  return MAD_LABS_UNIT_NAMES.has(normalizeUnitName(unitName))
    ? MAD_LABS_UNIT_ID
    : null;
}

export function getUserUnitId(user: HubUser | null | undefined): string | null {
  if (!user || user.source !== "employee") return null;
  return (
    user.unitId || user.unit_id || knownUnitIdForUnitName(unitNameOf(user))
  );
}

export function getUserUnitName(
  user: HubUser | null | undefined,
): string | null {
  if (!user || user.source !== "employee") return null;
  return unitNameOf(user);
}

export function isMadLabsUser(user: HubUser | null | undefined): boolean {
  return getUserUnitId(user) === MAD_LABS_UNIT_ID;
}
