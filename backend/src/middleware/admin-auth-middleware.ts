import type { Context, Next } from "hono";
import { ResponseError } from "../error/response-error";
import { isMadLabsUser } from "../lib/admin-access";
import type { SessionVariables } from "../type/hono-context";

export async function adminAuthMiddleware(
  c: Context<{ Variables: SessionVariables }>,
  next: Next,
) {
  const user = c.var.user;
  if (!user) {
    throw new ResponseError(401, "Not signed in.");
  }

  if (!isMadLabsUser(user)) {
    throw new ResponseError(
      403,
      "Access denied. Only MAD Labs members can access the Admin Dashboard.",
    );
  }

  await next();
}
