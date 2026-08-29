import type { HubUser } from "../type/central-type";

function unitNameOf(user: HubUser): string | null {
  if (user.source !== "employee") return null;
  if (typeof user.unit === "string") return user.unit;
  return user.unit?.name || null;
}

export function madLabsUnitId(): string | null {
  return process.env.MAD_LABS_UNIT_ID?.trim() || null;
}

export function getUserUnitId(user: HubUser | null | undefined): string | null {
  if (!user || user.source !== "employee") return null;
  return user.unitId || user.unit_id || null;
}

export function getUserUnitName(
  user: HubUser | null | undefined,
): string | null {
  if (!user || user.source !== "employee") return null;
  return unitNameOf(user);
}

export function isMadLabsUser(user: HubUser | null | undefined): boolean {
  const allowedUnitId = madLabsUnitId();
  return Boolean(allowedUnitId && getUserUnitId(user) === allowedUnitId);
}
