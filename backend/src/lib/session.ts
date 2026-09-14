import { sign, verify } from "hono/jwt";
import type { HubUser } from "../type/central-type";
import { prisma } from "./prisma";

const SESSION_EXP_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  user: HubUser;
  sessionVersion: number;
  exp: number;
};

// Bumping on every mint (not just logout) is what makes a fresh login
// elsewhere invalidate this session - verifySession() below rejects any
// token whose sessionVersion doesn't match the current row.
export async function signSession(user: HubUser): Promise<string> {
  const { session_version } = await prisma.userSession.upsert({
    where: { email: user.email },
    create: { email: user.email, session_version: 1 },
    update: { session_version: { increment: 1 } },
  });

  const payload: SessionPayload = {
    user,
    sessionVersion: session_version,
    exp: Math.floor(Date.now() / 1000) + SESSION_EXP_SECONDS,
  };
  return sign(payload, process.env.JWT_SECRET!, "HS256");
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const payload = (await verify(token, process.env.JWT_SECRET!, "HS256")) as unknown as SessionPayload;
    const current = await prisma.userSession.findUnique({ where: { email: payload.user.email } });
    if (!current || current.session_version !== payload.sessionVersion) return null;
    return payload;
  } catch {
    return null;
  }
}
