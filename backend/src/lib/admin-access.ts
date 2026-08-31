import type { HubUser } from "../type/central-type";
import { listActiveEmployees } from "./central-client";

const MAD_LABS_UNIT_NAMES = new Set(["mad lab", "mad labs"]);
const MAD_LABS_UNIT_CACHE_TTL_MS = 5 * 60 * 1000;

let madLabsUnitIdCache: { value: string | null; expiresAt: number } | null = null;
let madLabsUnitIdInFlight: Promise<string | null> | null = null;

function unitNameOf(user: HubUser): string | null {
  if (user.source !== "employee") return null;
  if (typeof user.unit === "string") return user.unit;
  return user.unit?.name || null;
}

function normalizedUnitName(value: string | null): string | null {
  return value?.trim().toLowerCase() || null;
}

async function resolveMadLabsUnitId(): Promise<string | null> {
  const employees = await listActiveEmployees();
  const madLabsEmployee = employees.find((employee) =>
    MAD_LABS_UNIT_NAMES.has(normalizedUnitName(unitNameOf(employee)) || ""),
  );

  return madLabsEmployee ? getUserUnitId(madLabsEmployee) : null;
}

export async function madLabsUnitId(): Promise<string | null> {
  const now = Date.now();
  if (madLabsUnitIdCache && madLabsUnitIdCache.expiresAt > now) {
    return madLabsUnitIdCache.value;
  }

  if (!madLabsUnitIdInFlight) {
    madLabsUnitIdInFlight = resolveMadLabsUnitId()
      .then((value) => {
        madLabsUnitIdCache = {
          value,
          expiresAt: Date.now() + MAD_LABS_UNIT_CACHE_TTL_MS,
        };
        return value;
      })
      .finally(() => {
        madLabsUnitIdInFlight = null;
      });
  }

  return madLabsUnitIdInFlight;
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

export async function isMadLabsUser(user: HubUser | null | undefined): Promise<boolean> {
  const userUnitId = getUserUnitId(user);
  if (!userUnitId) return false;

  const allowedUnitId = await madLabsUnitId();
  return Boolean(allowedUnitId && userUnitId === allowedUnitId);
}

export function clearMadLabsUnitIdCacheForTest() {
  madLabsUnitIdCache = null;
  madLabsUnitIdInFlight = null;
}
