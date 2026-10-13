import { Hono } from "hono";
import { SsoExchangeController } from "../controller/sso-exchange-controller";
import { internalSecretAuthMiddleware } from "../middleware/internal-secret-auth-middleware";

export const ssoRoute = new Hono();

// Central asks this when someone pastes the Hub's secret there, to see that it is the right one.
ssoRoute.post("/secret-check", SsoExchangeController.secretCheck);

// A person signed out of an application: the other applications end their session, the Hub's stays.
ssoRoute.post("/app-logout", internalSecretAuthMiddleware, SsoExchangeController.appLogout);

// Central says an application was retired, so the Hub has the application end its sessions.
ssoRoute.post("/app-retired", SsoExchangeController.appRetired);

ssoRoute.post(
  "/exchange",
  internalSecretAuthMiddleware,
  SsoExchangeController.exchange,
);
