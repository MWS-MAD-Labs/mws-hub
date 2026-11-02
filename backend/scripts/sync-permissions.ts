// Deploy step: tells Central which permissions Hub's code understands. The command is the shared one from
// mws-central-auth.
//   bun run permissions:sync [--confirm-removals] [--retries 5 --wait 20]
//     --retries/--wait: asks again when Central cannot be reached (it may be deploying). A no from
//     Central, or an endpoint it does not have yet, fails at once.
//   bun run permissions:check [--allow-removals]   (changes nothing, exits 1 on a mismatch)
import "dotenv/config";
import { runPermissionsCli } from "mws-central-auth/access/cli";
import { HUB_PERMISSIONS } from "../src/lib/hub-permissions";

const [mode, ...flags] = process.argv.slice(2);
if (mode !== "sync" && mode !== "check") {
  console.error("Use `sync` or `check`");
  process.exit(1);
}

process.exit(await runPermissionsCli({ application: "hub", manifest: HUB_PERMISSIONS, command: mode, argv: flags }));
