import { Hono } from "hono";
import { SsoExchangeController } from "../controller/sso-exchange-controller";
import { internalSecretAuthMiddleware } from "../middleware/internal-secret-auth-middleware";

export const ssoRoute = new Hono();

ssoRoute.post(
  "/exchange",
  internalSecretAuthMiddleware,
  SsoExchangeController.exchange,
);
