import { AppsService } from "../service/apps-service";
import { logger } from "./logger";

// Back-channel logout: tells every satellite app's own backend directly
// (server-to-server, never through the user's browser) that this person's
// session there should be invalidated. This is what actually makes
// cross-app single-logout reliable when Hub and the apps don't share a
// registrable domain - the browser-driven iframe fan-out (logoutTargets(),
// LogoutRelayPage.tsx) sets a cookie on another app's origin from inside a
// frame on Hub's own origin, which third-party cookie blocking can (and in
// production, does) silently drop. A direct HTTP call has no cookie jar to
// be blocked from - it can't fail that specific way.
//
// Best-effort: one app being slow or down must never block Hub's own
// logout from completing, so every call gets its own timeout and failures
// are only logged, never thrown.
const CALL_TIMEOUT_MS = 5000;

// personId is additive, not a replacement for email - existing satellite
// apps (mws-mtss-system) only read `email` from this body today and ignore
// unknown fields harmlessly. An app updated to key its own sessions by
// Central id (see UserSession here in Hub, or mws-daily-checkin's
// centralPersonId, for why) can start reading `central_id` instead once
// it's ready, without every consumer needing to move in lockstep.
//
// This is Central's Person.id - the same id space as the relay token's
// `sub` (mintRelayToken) - not Employee.id/Student.id (HubUser.id, what
// Hub's own UserSession/resolveCentralIdentityById key by internally).
// Those are a different id space per source; a receiving app has no
// `source` to disambiguate them with here, so Person.id is the only one
// that's safe to match on unconditionally.
export async function revokeSessionsForUser(email: string, personId?: string): Promise<void> {
  if (!email) return;

  const secret = process.env.HUB_INTERNAL_SECRET;
  if (!secret) {
    logger.error(
      "revokeSessionsForUser: HUB_INTERNAL_SECRET is not configured - skipping back-channel session revocation",
    );
    return;
  }

  const targets = await AppsService.revokeSessionTargets();
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Internal-Secret": secret,
          },
          body: JSON.stringify({ email, ...(personId ? { central_id: personId } : {}) }),
          signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
        });
        if (!res.ok) {
          logger.error(
            `revokeSessionsForUser: ${url} responded ${res.status}`,
          );
        }
      } catch (error) {
        logger.error(`revokeSessionsForUser: ${url} failed:`, error);
      }
    }),
  );
}
