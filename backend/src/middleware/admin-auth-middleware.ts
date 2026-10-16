import type { Context, Next } from "hono";
import { ResponseError } from "../error/response-error";
import { isHubAdmin } from "../lib/admin-access";
import { resolveCentralIdentityById } from "../lib/central-client";
import { logger } from "../lib/logger";
import type { SessionVariables } from "../type/hono-context";

export async function adminAuthMiddleware(
  c: Context<{ Variables: SessionVariables }>,
  next: Next,
) {
  const sessionUser = c.var.user;
  if (!sessionUser) {
    throw new ResponseError(401, "Not signed in.");
  }

  // Re-resolved by id, not the session snapshot's email - see the matching
  // comment on AppsController.launch() for why: email is editable in
  // Central, so a lookup keyed by it can go stale mid-session in a way id
  // never does.
  let user = sessionUser;
  try {
    user = (await resolveCentralIdentityById(sessionUser.id, sessionUser.source)) || sessionUser;
    c.set("user", user);
  } catch (error) {
    logger.error("Central lookup failed during admin authorization:", error);
    throw new ResponseError(503, "Cannot verify Central identity right now.");
  }

  if (!(await isHubAdmin(user))) {
    throw new ResponseError(
      403,
      "Access denied. The Admin Dashboard needs the hub.admin permission in Central.",
    );
  }

  await next();
}
