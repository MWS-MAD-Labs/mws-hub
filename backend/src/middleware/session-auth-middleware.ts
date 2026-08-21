import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifySession } from "../lib/session";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";

export async function sessionAuthMiddleware(
  c: Context<{ Variables: SessionVariables }>,
  next: Next,
) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
  const token = getCookie(c, cookieName);
  if (!token) {
    throw new ResponseError(401, "Not signed in.");
  }

  const session = await verifySession(token);
  if (!session) {
    throw new ResponseError(401, "Session expired or invalid.");
  }

  c.set("user", session.user);
  c.set("sid", session.sid);
  await next();
}
