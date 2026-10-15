import { asFailure } from "./central-failure";
import { listRegisteredPermissions, permissionUsage, publishPermissions } from "./central-client";
import { HUB_PERMISSIONS } from "./hub-permissions";
import { logger } from "./logger";
import { comparePermissions } from "./permission-check";
import type { PermissionManifestEntry } from "./central-client";

// The permission list of this version goes to Central when Hub starts, and is asked again every
// minute until it got there (Central down, or not deployed with the endpoints yet). The pipeline is
// what blocks a deploy for it; this repairs the case where Central changed later.
const APPLICATION_ID = "hub";
const RETRY_MS = 60_000;

export function permissionSyncEnabled() {
  return (process.env.HUB_PERMISSION_SYNC ?? "on").trim().toLowerCase() !== "off";
}

type Deps = {
  list: typeof listRegisteredPermissions;
  usage: typeof permissionUsage;
  publish: typeof publishPermissions;
};

const defaults: Deps = { list: listRegisteredPermissions, usage: permissionUsage, publish: publishPermissions };

export type PermissionSyncOutcome = "in_sync" | "published" | "refused" | "waiting" | "off";

export async function syncPermissionsOnce(
  manifest: PermissionManifestEntry[] = HUB_PERMISSIONS,
  deps: Partial<Deps> = {},
): Promise<PermissionSyncOutcome> {
  const d = { ...defaults, ...deps };
  if (!permissionSyncEnabled()) return "off";
  try {
    const [registered, usage] = await Promise.all([d.list(APPLICATION_ID), d.usage(APPLICATION_ID)]);
    const check = comparePermissions(manifest, registered, usage);
    if (check.notRegistered.length === 0 && check.wouldDrop.length === 0 && check.requiresDiffer.length === 0) {
      return "in_sync";
    }
    // Never confirms removals: Central refuses a list that would drop permissions roles still carry.
    const result = await d.publish(APPLICATION_ID, manifest, false);
    logger.info(`[permissions] Sent to Central: ${result.total} total, ${result.added} new`);
    if (result.affected_roles.length > 0) {
      logger.error(`[permissions] Roles still carry dropped permissions: ${result.affected_roles.map((role) => role.role).join(", ")}`);
    }
    return "published";
  } catch (error) {
    const failure = asFailure(error);
    if (failure.kind === "rejected") {
      logger.error(`[permissions] ${failure.message}. The list was not sent; the pipeline blocks the deploy for this.`);
      return "refused";
    }
    logger.error(`[permissions] ${failure.message}. The list was not sent; trying again every minute.`);
    return "waiting";
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

// Starts once per process. Stops asking as soon as the list is in Central, or Central said no.
export function startPermissionSync(
  run: () => Promise<PermissionSyncOutcome> = syncPermissionsOnce,
  intervalMs = RETRY_MS,
) {
  if (timer) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const outcome = await run();
      if (outcome !== "waiting" && timer) {
        clearInterval(timer);
        timer = null;
      }
    } catch (error) {
      logger.error("[permissions] Sync failed", error);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, intervalMs);
  (timer as { unref?: () => void }).unref?.();
  void tick();
}

export function stopPermissionSyncForTest() {
  if (timer) clearInterval(timer);
  timer = null;
}
