import type { HubUser } from "../type/central-type";
import { HUB_ADMIN_PERMISSION, userHasHubPermission } from "./hub-access-gate";

function unitNameOf(user: HubUser): string | null {
  if (user.source !== "employee") return null;
  if (typeof user.unit === "string") return user.unit;
  return user.unit?.name || null;
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

// Who may use the Admin Dashboard: the `hub.admin` permission of the person's role in Central, nothing else.
// An account on the emergency list is let in as admin only while Central gives it no access (see hub-access-gate).
export async function isHubAdmin(user: HubUser | null | undefined): Promise<boolean> {
  if (!user) return false;
  return userHasHubPermission(user, HUB_ADMIN_PERMISSION);
}
