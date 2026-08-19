import { sign } from "hono/jwt";

const ISSUER = "mws-hub";
const RELAY_TTL_SECONDS = 30;

export type SsoAppConfig = {
  audience: string;
  ssoEntryUrl: string;
};

// Only Daily Check-in for now - other satellite apps get added here once
// they build their own /auth/sso-style exchange endpoint.
export const SSO_APPS: Record<string, SsoAppConfig> = {
  "daily-checkin": {
    audience: "daily-checkin",
    ssoEntryUrl: `${process.env.DAILY_CHECKIN_API_URL}/auth/sso`,
  },
};

// Deliberately minimal claims - the receiving app re-derives every profile
// field from Central itself rather than trusting anything carried through
// a redirect URL. This token only asserts "Hub just authenticated this
// email for this audience," nothing else.
export async function mintRelayToken(email: string, appId: string): Promise<string | null> {
  const config = SSO_APPS[appId];
  if (!config) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER,
    aud: config.audience,
    sub: email,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + RELAY_TTL_SECONDS,
  };

  const secret = process.env.HUB_SSO_SECRET;
  if (!secret) {
    throw new Error("HUB_SSO_SECRET is not configured");
  }

  return sign(payload, secret, "HS256");
}
