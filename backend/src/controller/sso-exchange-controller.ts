import type { Context } from "hono";
import { ResponseError } from "../error/response-error";
import { sameSecret } from "../lib/hub-app-secret";
import { consumeSsoCode } from "../lib/sso-code-store";
import { logger } from "../lib/logger";

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
