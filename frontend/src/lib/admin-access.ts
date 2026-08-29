import type { AuthUser } from "@/model/auth-model";

export function getUserUnitId(
  user: AuthUser | null | undefined,
): string | null {
  if (!user || user.source !== "employee") return null;
  return user.unitId || user.unit_id || null;
}

export function isMadLabsUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.isAdmin);
}
