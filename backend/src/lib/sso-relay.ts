import { sign } from "hono/jwt";
import type { HubAppSso } from "../type/catalog-type";

const ISSUER = "mws-hub";
const RELAY_TTL_SECONDS = 30;

// The app registry used to live here as SSO_APPS. It now sits in
// data/hub-catalog.ts alongside every other app, so which apps exist, who
// may see them and who may open them are one list instead of two that had
// to be kept in step by hand. This module keeps the one job its name
// promises: signing the handoff.

// Deliberately minimal claims - the receiving app re-derives every profile
// field from Central itself rather than trusting anything carried through
// a redirect URL. This token only asserts "Hub just authenticated this
// email for this audience," nothing else.
//
// Takes a resolved sso config rather than an appId, so it cannot be called
// for an app that was never looked up, and authorization always happens at
// the call site before anything is signed.
export async function mintRelayToken(
  email: string,
  sso: HubAppSso,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER,
    aud: sso.appId,
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
