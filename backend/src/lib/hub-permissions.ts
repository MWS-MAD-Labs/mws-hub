import type { PermissionManifestEntry } from "./central-client";

// What Hub's code understands. Roles of the hub application in Central can only carry these.
// Send them with `bun run permissions:sync` on every deploy.
export const HUB_ADMIN_PERMISSION = "hub.admin";
// Needed to sign in: an active access whose role lacks it is turned away like no access.
export const HUB_USE_PERMISSION = "hub.use";

export const HUB_PERMISSIONS: PermissionManifestEntry[] = [
  { key: HUB_USE_PERMISSION, description: "Sign in to Hub and open the apps given to the person" },
  { key: HUB_ADMIN_PERMISSION, description: "Open the Admin Dashboard", requires: ["hub.use"] },
];
