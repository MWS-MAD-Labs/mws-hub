import type { Context, Next } from "hono";
import { ResponseError } from "../error/response-error";
import { acceptsInternalSecret } from "../lib/hub-app-secret";

// Guards server-to-server endpoints only a satellite app's own backend
// should be able to call - the same shared secret revokeSessionsForUser
// already sends the other direction (Hub -> satellite), reused here for
// the reverse (satellite -> Hub) since both directions sit in the same
// trust boundary and every satellite app already has this env var deployed.
export async function internalSecretAuthMiddleware(c: Context, next: Next) {
  const master = process.env.HUB_INTERNAL_SECRET;
  if (!master) {
    throw new ResponseError(503, "HUB_INTERNAL_SECRET is not configured.");
  }

  const provided = c.req.header("x-hub-internal-secret") || "";
  // An application with a secret of its own says which application it is in the body of the call.
  const body = (await c.req.raw.clone().json().catch(() => null)) as { appId?: unknown } | null;
  const appId = typeof body?.appId === "string" ? body.appId : null;

  if (!(await acceptsInternalSecret(provided, master, appId))) {
    throw new ResponseError(401, "Invalid or missing internal secret.");
  }

  await next();
}
