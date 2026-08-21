import { Hono } from "hono";
import { AuthController } from "../controller/auth-controller";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const authRoute = new Hono<{ Variables: SessionVariables }>();

authRoute.post("/google", AuthController.loginWithGoogle);
authRoute.get("/me", sessionAuthMiddleware, AuthController.me);

// Browser-facing logout: needs the Hub session cookie.
authRoute.post("/logout", sessionAuthMiddleware, AuthController.logout);

// Back-channel, called by satellite backends with client credentials rather
// than a cookie. These are what make logout inside an app end the session
// everywhere, and what keeps access tokens short without signing people out.
authRoute.post("/app-logout", AuthController.logoutFromApp);
authRoute.post("/token", AuthController.token);
