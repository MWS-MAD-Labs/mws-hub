import { Hono } from "hono";
import { SsoExchangeController } from "../controller/sso-exchange-controller";
import { internalSecretAuthMiddleware } from "../middleware/internal-secret-auth-middleware";

export const ssoRoute = new Hono();

// Central asks this when someone pastes the Hub's secret there, to see that it is the right one.
ssoRoute.post("/secret-check", SsoExchangeController.secretCheck);

ssoRoute.post(
  "/exchange",
  internalSecretAuthMiddleware,
  SsoExchangeController.exchange,
);
