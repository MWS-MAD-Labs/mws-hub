import type { Context } from "hono";
import { mintRelayToken, SSO_APPS } from "../lib/sso-relay";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";

export class AppsController {
  static async launch(c: Context<{ Variables: SessionVariables }>) {
    const appId = c.req.param("appId");
    const config = appId ? SSO_APPS[appId] : undefined;
    if (!config) {
      throw new ResponseError(404, `Unknown app: ${appId}`);
    }

    const token = await mintRelayToken(c.var.user.email, appId!);
    if (!token) {
      throw new ResponseError(404, `Unknown app: ${appId}`);
    }

    return c.redirect(`${config.ssoEntryUrl}?token=${encodeURIComponent(token)}`, 302);
  }
}
