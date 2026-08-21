import { signJwt } from "./jwt";
import type { HubAppSso } from "../type/catalog-type";

const RELAY_TTL_SECONDS = 30;

// The app registry used to live here as SSO_APPS. It now sits in
// data/hub-catalog.ts alongside every other app, so which apps exist, who
// may see them and who may open them are one list instead of two that had
// to be kept in step by hand. The RSA plumbing moved to lib/jwt.ts, shared
// with the access and logout tokens. This module keeps the one job its name
// promises: describing the handoff.

// Re-exported so index.ts keeps serving JWKS from its original import.
export { hubSsoJwks } from "./jwt";

// Deliberately minimal claims - the receiving app re-derives every profile
// field from Central itself rather than trusting anything carried through
// a redirect URL. This token asserts only "Hub just authenticated this
// email for this audience, under this session."
//
// `sid` is the one addition that matters: it ties whatever session the app
// creates back to the Hub session, which is what makes logout in one app
// able to end the session everywhere else.
//
// Takes a resolved sso config rather than an appId, so it cannot be called
// for an app that was never looked up, and authorization always happens at
// the call site before anything is signed.
export async function mintRelayToken(
  email: string,
  sso: HubAppSso,
  sid: string,
): Promise<string> {
  return signJwt(
    {
      aud: sso.appId,
      sub: email,
      sid,
      jti: crypto.randomUUID(),
    },
    RELAY_TTL_SECONDS,
  );
}
