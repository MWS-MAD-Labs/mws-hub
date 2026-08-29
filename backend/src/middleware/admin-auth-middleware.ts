import type { Context, Next } from "hono";
import { ResponseError } from "../error/response-error";
import { isMadLabsUser } from "../lib/admin-access";
import { resolveCentralIdentity } from "../lib/central-client";
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

  let user = sessionUser;
  try {
    user = (await resolveCentralIdentity(sessionUser.email)) || sessionUser;
    c.set("user", user);
  } catch (error) {
    logger.error("Central lookup failed during admin authorization:", error);
    throw new ResponseError(503, "Cannot verify Central identity right now.");
  }

  if (!isMadLabsUser(user)) {
    throw new ResponseError(
      403,
      "Access denied. Only MAD Labs members can access the Admin Dashboard.",
    );
  }

  await next();
}
