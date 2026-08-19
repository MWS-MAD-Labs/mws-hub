import { sign, verify } from "hono/jwt";
import type { HubUser } from "../type/central-type";

const SESSION_EXP_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  user: HubUser;
  exp: number;
};

export async function signSession(user: HubUser): Promise<string> {
  const payload: SessionPayload = {
    user,
    exp: Math.floor(Date.now() / 1000) + SESSION_EXP_SECONDS,
  };
  return sign(payload, process.env.JWT_SECRET!, "HS256");
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const payload = await verify(token, process.env.JWT_SECRET!, "HS256");
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
