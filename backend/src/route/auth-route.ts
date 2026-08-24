import { Hono } from "hono";
import { AuthController } from "../controller/auth-controller";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const authRoute = new Hono<{ Variables: SessionVariables }>();

authRoute.post("/google", AuthController.loginWithGoogle);
authRoute.post("/logout", AuthController.logout);
authRoute.get("/me", sessionAuthMiddleware, AuthController.me);
