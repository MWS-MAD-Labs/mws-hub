import type { AuthUser } from "@/model/auth-model";

export function getUserUnitId(
  user: AuthUser | null | undefined,
): string | null {
  if (!user) return null;
  if ("type" in user) return user.unit_id;
  if (user.source === "student") return null;
  return user.unitId || user.unit_id || null;
}

export function isMadLabsUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user && ("type" in user || user.isAdmin));
}
