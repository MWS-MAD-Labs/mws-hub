import { Hono } from "hono";
import { SsoExchangeController } from "../controller/sso-exchange-controller";
import { internalSecretAuthMiddleware } from "../middleware/internal-secret-auth-middleware";

export const ssoRoute = new Hono();

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
