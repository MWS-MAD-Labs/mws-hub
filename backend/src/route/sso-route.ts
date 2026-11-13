import { Hono } from "hono";
import type { Context, Next } from "hono";
import { OidcController } from "../controller/oidc-controller";
import { SsoExchangeController } from "../controller/sso-exchange-controller";
import { ResponseError } from "../error/response-error";
import { frontendOrigin } from "../lib/frontend-origin";
import { internalSecretAuthMiddleware } from "../middleware/internal-secret-auth-middleware";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const ssoRoute = new Hono<{ Variables: SessionVariables }>();

// Central asks this when someone pastes the Hub's secret there, to see that it is the right one.
ssoRoute.post("/secret-check", SsoExchangeController.secretCheck);

// Central says an application was retired, so the Hub has the application end its sessions.
ssoRoute.post("/app-retired", SsoExchangeController.appRetired);

// Central asks when a code was last traded for an application, to see it signs in the code and token way.
ssoRoute.post("/exchange-seen", SsoExchangeController.exchangeSeen);

ssoRoute.post(
  "/exchange",
  internalSecretAuthMiddleware,
  SsoExchangeController.exchange,
);

// A signed-out person goes through Hub's login and comes back to the same
// authorize URL, the way a card launch does (launchSessionAuthMiddleware).
async function oidcSessionAuthMiddleware(c: Context<{ Variables: SessionVariables }>, next: Next) {
  try {
    await sessionAuthMiddleware(c, next);
  } catch (error) {
    if (error instanceof ResponseError && error.status === 401) {
      const url = new URL(c.req.url);
      const params = new URLSearchParams({ redirect: `${url.pathname}${url.search}` });
      return c.redirect(`${frontendOrigin()}/login?${params}`, 302);
    }
    throw error;
  }
}

// Hub as an OpenID Connect provider (see lib/oidc-provider.ts). The issuer is
// <origin>/sso/oidc, so discovery sits under it and needs no gateway change.
ssoRoute.get("/oidc/.well-known/openid-configuration", OidcController.discovery);
ssoRoute.get("/oidc/authorize", oidcSessionAuthMiddleware, OidcController.authorize);
ssoRoute.post("/oidc/token", OidcController.token);
