import { signJwt } from "./jwt";
import { logger } from "./logger";
import { HUB_CATALOG } from "../data/hub-catalog";

const LOGOUT_TOKEN_TTL_SECONDS = 120;
const FANOUT_TIMEOUT_MS = 3000;

// Apps expose their logout receiver next to their SSO entry point, so the
// URL is derived rather than configured twice. Keeping it derived means a
// new app cannot end up with an SSO endpoint Hub knows about and a logout
// endpoint it does not.
function backchannelUrlFor(entryUrl: string): string {
  return entryUrl.replace(/\/auth\/sso\/?$/, "/auth/backchannel-logout");
}

// Signed with the same RSA key as everything else, so an app verifies it
// through JWKS with no extra secret. `events` mirrors the OIDC back-channel
// logout shape, which costs nothing now and means a future app built
// against a standard library will just work.
async function mintLogoutToken(sid: string, appId: string): Promise<string> {
  return signJwt(
    {
      aud: appId,
      sid,
      jti: crypto.randomUUID(),
      events: { "http://schemas.openid.net/event/backchannel-logout": {} },
    },
    LOGOUT_TOKEN_TTL_SECONDS,
  );
}

// Tells every app that was launched under this session to drop its local
// session too. Best effort by design: one unreachable app must not stop the
// others from being told, and it must not fail the user's logout. The Hub
// session is already gone by the time this runs, so the worst case is a
// satellite holding a session that can no longer be refreshed - it dies at
// the end of its access token TTL.
export async function fanOutLogout(
  sid: string,
  appIds: string[],
  exceptAppId?: string,
): Promise<void> {
  const targets = appIds.filter((appId) => appId !== exceptAppId);

  await Promise.allSettled(
    targets.map(async (appId) => {
      const entry = HUB_CATALOG.find((app) => app.sso?.appId === appId);
      if (!entry?.sso) return;

      const url = backchannelUrlFor(entry.sso.entryUrl);

      try {
        const token = await mintLogoutToken(sid, appId);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ logout_token: token }),
          signal: AbortSignal.timeout(FANOUT_TIMEOUT_MS),
        });

        if (!response.ok) {
          logger.error(`Back-channel logout rejected by ${appId}:`, response.status);
        }
      } catch (error) {
        logger.error(`Back-channel logout could not reach ${appId}:`, error);
      }
    }),
  );
}
