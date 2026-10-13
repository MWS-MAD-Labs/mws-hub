import type { Context } from "hono";
import { ResponseError } from "../error/response-error";
import { sameSecret } from "../lib/hub-app-secret";
import { consumeSsoCode } from "../lib/sso-code-store";
import { logger } from "../lib/logger";
import { revokeAllSessionsForApp, revokeSessionsForUser } from "../lib/session-revocation";

export class SsoExchangeController {
  // Says only whether the sent secret is the master one. Nothing else comes back.
  static async secretCheck(c: Context) {
    const master = process.env.HUB_INTERNAL_SECRET;
    if (!master) {
      throw new ResponseError(503, "HUB_INTERNAL_SECRET is not configured.");
    }
    const provided = c.req.header("x-hub-internal-secret") || "";
    if (!provided || !sameSecret(provided, master)) {
      throw new ResponseError(401, "Invalid or missing internal secret.");
    }
    return c.json({ data: { ok: true } });
  }

  // A person signed out of an application. Every application ends their session, and the Hub's own stays.
  // Server-to-server only (see internalSecretAuthMiddleware).
  static async appLogout(c: Context) {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const personId = typeof body?.central_id === "string" ? body.central_id : undefined;
    if (!email || !personId) throw new ResponseError(400, "email and central_id are required.");
    logger.info(`App logout: ${email} signed out of ${String(body?.appId ?? "an application")}, ending the other sessions`);
    await revokeSessionsForUser(email, personId);
    return c.json({ data: { ok: true } });
  }

  // Central retired an application: its backend is told to end every session it holds. Master secret only.
  static async appRetired(c: Context) {
    const master = process.env.HUB_INTERNAL_SECRET;
    if (!master) throw new ResponseError(503, "HUB_INTERNAL_SECRET is not configured.");
    const provided = c.req.header("x-hub-internal-secret") || "";
    if (!provided || !sameSecret(provided, master)) {
      throw new ResponseError(401, "Invalid or missing internal secret.");
    }
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const applicationId = typeof body?.application_id === "string" ? body.application_id : "";
    const logoutUrl = typeof body?.logout_url === "string" ? body.logout_url : "";
    const version = Number(body?.secret_version);
    if (!applicationId || !logoutUrl) throw new ResponseError(400, "application_id and logout_url are required.");
    const notified = await revokeAllSessionsForApp(master, {
      applicationId,
      logoutUrl,
      secretMode: body?.secret_mode === "OWN" ? "OWN" : "SHARED",
      secretVersion: Number.isInteger(version) && version > 0 ? version : 1,
    });
    return c.json({ data: { notified } });
  }

  // Server-to-server only (see internalSecretAuthMiddleware) - a receiving
  // app's backend trades the short opaque code from its ?code= redirect for
  // the actual relay token, without that token ever having sat in a URL a
  // browser touched.
  static async exchange(c: Context) {
    const body = (await c.req.json().catch(() => null)) as
      | { code?: unknown; appId?: unknown; state?: unknown }
      | null;
    const code = typeof body?.code === "string" ? body.code : null;
    const appId = typeof body?.appId === "string" ? body.appId : null;
    const state = typeof body?.state === "string" ? body.state : null;

    if (!code || !appId) {
      throw new ResponseError(400, "'code' and 'appId' are required.");
    }

    const token = await consumeSsoCode(code, appId, state);
    if (!token) {
      logger.info(
        `SSO code exchange failed for app "${appId}": missing, expired, already used, or minted for a different app.`,
      );
      throw new ResponseError(400, "Invalid, expired, or already-used code.");
    }

    return c.json({ data: { token } });
  }
}
