import { timingSafeEqual } from "crypto";

// Satellites authenticate themselves when they call Hub's back-channel
// endpoints (refresh, RP-initiated logout). This is an ordinary client
// credential, not a token-signing key: it proves "this caller is MTSS", and
// it cannot be used to mint anything other systems would trust. That is why
// it is safe to be symmetric while relay and access tokens stay RS256.
//
// One secret per app, by env convention:
//   daily-checkin -> HUB_CLIENT_SECRET_DAILY_CHECKIN
//   mtss          -> HUB_CLIENT_SECRET_MTSS
export function clientSecretEnvName(appId: string): string {
  return `HUB_CLIENT_SECRET_${appId.toUpperCase().replace(/-/g, "_")}`;
}

const equals = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, so compare lengths first and
  // still run the comparison to keep the timing profile flat.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export function verifyClientCredentials(
  appId: string | undefined,
  secret: string | undefined,
): boolean {
  if (!appId || !secret) return false;

  const expected = process.env[clientSecretEnvName(appId)];
  if (!expected) return false;

  return equals(secret, expected);
}
