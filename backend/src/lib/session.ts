import { sign, verify } from "hono/jwt";
import type { HubUser } from "../type/central-type";
import { prisma } from "./prisma";
import { sessionEndsAt } from "./session-expiry";
import type { DeviceMetadata } from "./device-session";

export type SessionPayload = {
  user: HubUser;
  sessionId: string;
  sessionVersion: number;
  exp: number;
  // When the copy of the person in `user` was taken from Central (epoch seconds).
  // A token from before this field existed counts as old and is refreshed.
  identityAt?: number;
};

export type CreatedSession = {
  token: string;
  sessionId: string;
  sessionVersion: number;
  expiresAt: Date;
};

export async function createSession(
  user: HubUser,
  metadata: DeviceMetadata = { deviceName: "Unknown device", userAgent: null },
): Promise<CreatedSession> {
  const account = await prisma.userSession.upsert({
    where: { central_id: user.id },
    create: { central_id: user.id, email: user.email, session_version: 1 },
    update: { email: user.email },
  });
  const expiresAt = sessionEndsAt();
  const loginSession = await prisma.loginSession.create({
    data: {
      central_id: user.id,
      person_id: user.person_id,
      source: user.source,
      email: user.email,
      account_version: account.session_version,
      device_name: metadata.deviceName,
      user_agent: metadata.userAgent,
      expires_at: expiresAt,
    },
  });

  const payload: SessionPayload = {
    user,
    sessionId: loginSession.id,
    sessionVersion: account.session_version,
    exp: Math.floor(expiresAt.getTime() / 1000),
    identityAt: Math.floor(Date.now() / 1000),
  };
  return {
    token: await sign(payload, process.env.JWT_SECRET!, "HS256"),
    sessionId: loginSession.id,
    sessionVersion: account.session_version,
    expiresAt,
  };
}

export async function signSession(user: HubUser): Promise<string> {
  return (await createSession(user)).token;
}

// The same session with a newer copy of the person: same version, same end time.
export async function signRefreshedSession(payload: SessionPayload, user: HubUser): Promise<string> {
  const refreshed: SessionPayload = {
    user,
    sessionId: payload.sessionId,
    sessionVersion: payload.sessionVersion,
    exp: payload.exp,
    identityAt: Math.floor(Date.now() / 1000),
  };
  return sign(refreshed, process.env.JWT_SECRET!, "HS256");
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const payload = (await verify(token, process.env.JWT_SECRET!, "HS256")) as unknown as SessionPayload;
    if (!payload.sessionId) return null;
    const [account, loginSession] = await Promise.all([
      prisma.userSession.findUnique({ where: { central_id: payload.user.id } }),
      prisma.loginSession.findUnique({ where: { id: payload.sessionId } }),
    ]);
    if (!account || account.session_version !== payload.sessionVersion) return null;
    if (
      !loginSession ||
      loginSession.central_id !== payload.user.id ||
      loginSession.account_version !== payload.sessionVersion ||
      loginSession.revoked_at ||
      loginSession.expires_at.getTime() <= Date.now()
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

const lastSeenWrites = new Map<string, number>();

export async function touchSession(sessionId: string): Promise<void> {
  const interval = Math.max(60, Number(process.env.HUB_SESSION_LAST_SEEN_WRITE_SECONDS) || 300) * 1000;
  const lastWrite = lastSeenWrites.get(sessionId) ?? 0;
  if (Date.now() - lastWrite < interval) return;
  lastSeenWrites.set(sessionId, Date.now());
  await prisma.loginSession.updateMany?.({
    where: { id: sessionId, revoked_at: null },
    data: { last_seen_at: new Date() },
  });
}
