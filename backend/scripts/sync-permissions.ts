// Deploy step: tells Central which permissions Hub's code understands.
//   bun run permissions:sync [--confirm-removals]
//   bun run permissions:check [--allow-removals]   (changes nothing, exits 1 on a mismatch)
import "dotenv/config";
import {
  listRegisteredPermissions,
  permissionUsage,
  publishPermissions,
} from "../src/lib/central-client";
import { HUB_PERMISSIONS } from "../src/lib/hub-permissions";
import { comparePermissions, permissionCheckFailed } from "../src/lib/permission-check";

const APPLICATION_ID = "hub";
const [mode, ...flags] = process.argv.slice(2);

async function sync() {
  const result = await publishPermissions(APPLICATION_ID, HUB_PERMISSIONS, flags.includes("--confirm-removals"));
  console.log(`hub permissions published: ${result.total} total, ${result.added} new`);
  if (result.deprecated.length > 0) {
    console.warn(`dropped from the list: ${result.deprecated.join(", ")}`);
  }
  if (result.affected_roles.length > 0) {
    console.warn("these active roles still carry a dropped permission, move them to a current one:");
    for (const role of result.affected_roles) console.warn(`  ${role.role}: ${role.permissions.join(", ")}`);
  }
}

async function check() {
  const [registered, usage] = await Promise.all([listRegisteredPermissions(APPLICATION_ID), permissionUsage(APPLICATION_ID)]);
  const result = comparePermissions(HUB_PERMISSIONS, registered, usage);
  const lines: [string, string[]][] = [
    ["not registered in Central yet (a deploy adds them)", result.notRegistered],
    ["registered but gone from the code (a deploy drops them)", result.wouldDrop],
    ["carried by roles but unknown to the code", result.unknownToCode],
    ["registered with different needs than the code", result.requiresDiffer],
  ];
  for (const [label, keys] of lines) if (keys.length > 0) console.warn(`${label}: ${keys.join(", ")}`);
  if (permissionCheckFailed(result, flags.includes("--allow-removals"))) {
    console.error("hub permissions do not match Central");
    process.exit(1);
  }
  console.log("hub permissions match Central");
}

try {
  if (mode === "sync") await sync();
  else if (mode === "check") await check();
  else throw new Error("Use `sync` or `check`");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
