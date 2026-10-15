import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { currentSessionUser } from "../lib/identity-refresh";
import { sessionCookieName } from "../lib/session-cookie";
import { verifySession } from "../lib/session";
import { ensureHubAccessForSession } from "../lib/hub-access-gate";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";

export async function sessionAuthMiddleware(
  c: Context<{ Variables: SessionVariables }>,
  next: Next,
) {
  const cookieName = sessionCookieName();
  const token = getCookie(c, cookieName);
  if (!token) {
    throw new ResponseError(401, "Not signed in.");
  }

  const session = await verifySession(token);
  if (!session) {
    throw new ResponseError(401, "Session expired or invalid.");
  }

  const user = await currentSessionUser(c, session);
  await ensureHubAccessForSession(user);

  c.set("user", user);
  await next();
}
