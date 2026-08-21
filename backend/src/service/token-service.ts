import { signJwt } from "../lib/jwt";
import { issueRefreshToken } from "../lib/session-store";
import type { HubUser } from "../type/central-type";
import type { CentralClaim } from "../type/central-type";

// Access tokens are short so that revoking a session actually bites: the
// worst case after logout is one remaining TTL. Refresh tokens carry the
// long life instead, and those are revocable because Hub stores them.
const ACCESS_TTL_SECONDS = 15 * 60;

// Superadmins keep a long-lived access token by explicit decision of the
// system owner. Everyone else refreshes every fifteen minutes.
//
// Note this reads a Central-supplied role. While Central does not return
// role claims, nobody matches and everyone gets the short TTL - which is
// the safe direction to fail, and the tiering starts working on its own the
// moment Central emits roles again.
const ACCESS_TTL_SECONDS_SUPERADMIN = 7 * 24 * 60 * 60;

const SUPERADMIN_KEYS = new Set(["super-admin", "superadmin", "super_admin"]);

const claimToKeys = (claim: CentralClaim): string[] => {
  if (typeof claim === "string") return [claim];
  return [claim.key, claim.slug, claim.code, claim.name, claim.role].filter(
    (value): value is string => Boolean(value),
  );
};

const normalize = (value: string) => value.toLowerCase().trim().replace(/[\s_]+/g, "-");

export function isSuperadmin(user: HubUser): boolean {
  const keys = [
    ...(user.role ? [user.role] : []),
    ...(user.roles || []).flatMap(claimToKeys),
  ].map(normalize);

  return keys.some((key) => SUPERADMIN_KEYS.has(key));
}

export function accessTtlFor(user: HubUser): number {
  return isSuperadmin(user) ? ACCESS_TTL_SECONDS_SUPERADMIN : ACCESS_TTL_SECONDS;
}

export type AppTokenSet = {
  token_type: "Bearer";
  access_token: string;
  refresh_token: string;
  expires_in: number;
  sid: string;
};

// What a satellite receives, both at the SSO handoff and at every refresh.
// The access token carries `sid` so the app can drop exactly the right
// session when back-channel logout arrives, and carries roles so the app
// stops having to derive them from HR fields on its own.
export async function issueAppTokens(
  user: HubUser,
  sid: string,
  appId: string,
): Promise<AppTokenSet> {
  const expiresIn = accessTtlFor(user);

  const accessToken = await signJwt(
    {
      aud: appId,
      sub: user.email,
      sid,
      typ: "access",
      source: user.source,
      // Deduped: a Central claim carries both a key and a display name, and
      // both normalise to the same thing, so a plain map would put every
      // role in the token twice.
      roles: [...new Set((user.roles || []).flatMap(claimToKeys).map(normalize))],
    },
    expiresIn,
  );

  const refreshToken = await issueRefreshToken(sid, appId, user.email);

  return {
    token_type: "Bearer",
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    sid,
  };
}
