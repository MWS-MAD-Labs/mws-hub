import type { PermissionManifestEntry, RegisteredPermission } from "./central-client";

export type PermissionCheck = {
  // In the code but not registered in Central yet, so a deploy would add them.
  notRegistered: string[];
  // Registered and current in Central but gone from the code, so a deploy would drop them.
  wouldDrop: string[];
  // Active roles carry these but the code does not know them, so Hub ignores them.
  unknownToCode: string[];
  // Registered with other needs than the code says.
  requiresDiffer: string[];
};

// Same comparison as comparePermissions in mws-central-auth/data-client. Hub does not depend
// on that package, so the few lines live here.
export function comparePermissions(
  code: PermissionManifestEntry[],
  registered: RegisteredPermission[],
  usage: string[],
): PermissionCheck {
  const inCode = new Set(code.map((entry) => entry.key));
  const current = registered.filter((entry) => !entry.deprecated);
  const same = (left: string[] = [], right: string[] = []) =>
    [...left].sort().join("\n") === [...right].sort().join("\n");
  return {
    notRegistered: code.filter((entry) => !current.some((row) => row.key === entry.key)).map((entry) => entry.key),
    wouldDrop: current.filter((row) => !inCode.has(row.key)).map((row) => row.key),
    unknownToCode: usage.filter((key) => !inCode.has(key)),
    requiresDiffer: code
      .filter((entry) => {
        const row = current.find((candidate) => candidate.key === entry.key);
        return row !== undefined && !same(entry.requires, row.requires);
      })
      .map((entry) => entry.key),
  };
}

// Not registered yet is expected before a deploy, so it is not a failure.
export function permissionCheckFailed(check: PermissionCheck, allowRemovals = false): boolean {
  return (
    check.unknownToCode.length > 0 ||
    check.requiresDiffer.length > 0 ||
    (!allowRemovals && check.wouldDrop.length > 0)
  );
}
