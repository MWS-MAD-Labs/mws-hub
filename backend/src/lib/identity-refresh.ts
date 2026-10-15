import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { ResponseError } from "../error/response-error";
import type { HubUser } from "../type/central-type";
import { resolveCentralIdentityById } from "./central-client";
import { logger } from "./logger";
import { sessionCookieName, sessionCookieOptions } from "./session-cookie";
import { signRefreshedSession, type SessionPayload } from "./session";

// How old the copy of the person in the session may get before Central is asked again.
// 0 turns refreshing off.
function refreshAfterSeconds(): number {
  const raw = process.env.HUB_IDENTITY_REFRESH_MINUTES;
  const minutes = raw === undefined || raw === "" ? 10 : Number(raw);
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : 10) * 60;
}

const inFlight = new Map<string, Promise<HubUser | null>>();

function askCentral(user: HubUser): Promise<HubUser | null> {
  const running = inFlight.get(user.id);
  if (running) return running;
  const call = resolveCentralIdentityById(user.id, user.source).finally(() => inFlight.delete(user.id));
  inFlight.set(user.id, call);
  return call;
}

// The person as Central knows them now, at most a few minutes old. The session keeps its
// version and end time, so this never signs anyone out by itself, and when Central cannot be
// reached the copy the session already has stays in use. Someone Central no longer lists as
// active loses the session.
export async function currentSessionUser(c: Context, session: SessionPayload): Promise<HubUser> {
  const after = refreshAfterSeconds();
  if (after === 0) return session.user;
  const age = Math.floor(Date.now() / 1000) - (session.identityAt ?? 0);
  if (age < after) return session.user;

  let fresh: HubUser | null;
  try {
    fresh = await askCentral(session.user);
  } catch (error) {
    logger.error("Identity refresh failed, keeping the copy in the session:", error);
    return session.user;
  }
  if (!fresh) throw new ResponseError(401, "Your account is no longer active.");

  const token = await signRefreshedSession(session, fresh);
  setCookie(c, sessionCookieName(), token, {
    ...sessionCookieOptions(),
    maxAge: Math.max(session.exp - Math.floor(Date.now() / 1000), 1),
  });
  return fresh;
}
