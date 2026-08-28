import type { Context } from "hono";
import { AppsService, canAccess } from "../service/apps-service";
import { mintRelayToken } from "../lib/sso-relay";
import { resolveCentralIdentity } from "../lib/central-client";
import { ResponseError } from "../error/response-error";
import { logger } from "../lib/logger";
import { frontendOrigin } from "../lib/frontend-origin";
import type { HubUser } from "../type/central-type";
import type { SessionVariables } from "../type/hono-context";

// Launch is a browser navigation, not an XHR, so a failure here has to land
// somewhere a person can read. Same shape the satellite apps already use for
// their own SSO failures: back to the hub with a code, never a raw JSON body
// in a fresh tab.
function launchFailure(c: Context, code: string, appName?: string) {
  const origin = frontendOrigin();
  const params = new URLSearchParams({ error: code });
  // Naming the app turns "something went wrong" into "Exima is under
  // maintenance", which is the difference between a notice and a shrug.
  if (appName) params.set("app", appName);

  return c.redirect(`${origin}/support-hub?${params}`, 302);
}

export class AppsController {
  // The catalog is already filtered to what this person may open, so an app
  // they have no access to simply isn't in the response - no locked card,
  // no placeholder. The session snapshot is good enough to decide what to
  // show; only launch below re-checks with Central, because only launch
  // hands out a credential.
  static async list(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await AppsService.listFor(c.var.user) });
  }

  static async launch(c: Context<{ Variables: SessionVariables }>) {
    const appId = c.req.param("appId");
    const entry = appId ? await AppsService.findByLaunchId(appId) : null;
    if (!entry) {
      throw new ResponseError(404, `Unknown app: ${appId}`);
    }

    // The session cookie is an 8-hour-old snapshot of who this was at login.
    // Minting a credential another app will trust deserves a fresher answer
    // than that: someone deactivated in Central mid-session would otherwise
    // keep letting themselves into every app until their cookie expired.
    // Central's lookups already filter on ACTIVE, so a resigned employee or
    // a departed student resolves to null here.
    let user: HubUser | null;
    try {
      user = await resolveCentralIdentity(c.var.user.email);
    } catch (error) {
      // Fail closed. A Central outage means we cannot say who this is, and
      // "cannot say" must never be treated as "allowed".
      logger.error("Central lookup failed during launch:", error);
      return launchFailure(c, "central_unavailable");
    }

    if (!user) {
      logger.info("Launch refused, no active Central record:", c.var.user.email);
      return launchFailure(c, "account_inactive");
    }

    // Same predicate the catalog filters on, so an app can never be openable
    // by someone it was hidden from, or hidden from someone who could open
    // it by pasting the URL.
    if (!canAccess(entry, user)) {
      logger.info(
        `Launch refused, ${user.source} not admitted by ${entry.id}:`,
        user.email,
      );
      return launchFailure(c, "app_access_denied", entry.name);
    }

    if (entry.status === "maintenance") {
      return launchFailure(c, "app_maintenance", entry.name);
    }

    if (entry.status === "coming_soon") {
      return launchFailure(c, "app_coming_soon", entry.name);
    }

    if (entry.sso) {
      const token = await mintRelayToken(user.email, entry.sso);

      return c.redirect(
        `${entry.sso.entryUrl}?token=${encodeURIComponent(token)}`,
        302,
      );
    }

    if (!entry.href) {
      return launchFailure(c, "app_no_link", entry.name);
    }

    return c.redirect(entry.href, 302);
  }
}
