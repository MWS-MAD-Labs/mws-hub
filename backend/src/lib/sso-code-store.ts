import { randomUUID } from "node:crypto";

// A bit more headroom than the relay token's own 30s exp, since exchanging
// a code costs one extra network hop (the receiving app's backend calling
// Hub back) that a browser redirect alone doesn't.
const CODE_TTL_MS = 60_000;

type StoredExchange = {
  token: string;
  appId: string;
  expiresAt: number;
};

// In-memory, single-instance - same tradeoff InMemoryReplayStore in
// mws-central-auth documents: fine as long as Hub runs one instance, but a
// horizontally-scaled Hub needs this backed by Redis/a DB row instead, or a
// code minted on one instance can't be redeemed against another.
const pending = new Map<string, StoredExchange>();

function sweep(): void {
  const now = Date.now();
  for (const [code, entry] of pending) {
    if (entry.expiresAt <= now) pending.delete(code);
  }
}

// Called by AppsController.launch() right after minting a relay token:
// hands back a short opaque code for the browser redirect instead of
// putting the token itself in a URL, where it would sit in server access
// logs, browser history, and any referrer header a page on the receiving
// origin sends. Only the receiving app's own backend ever sees the real
// token, via consumeSsoCode() below over a trusted server-to-server call
// (see the /sso/exchange route) - never the browser.
export function createSsoCode(token: string, appId: string): string {
  sweep();
  const code = randomUUID();
  pending.set(code, { token, appId, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

// Single-use: deleted the moment it's looked up, valid or not - so a code
// that somehow does leak (the same exposure surface a bearer token in a URL
// used to have) is only ever worth one redemption attempt, and only by the
// specific app it was minted for.
export function consumeSsoCode(code: string, appId: string): string | null {
  sweep();
  const entry = pending.get(code);
  pending.delete(code);

  if (!entry) return null;
  if (entry.appId !== appId) return null;
  if (entry.expiresAt <= Date.now()) return null;

  return entry.token;
}
