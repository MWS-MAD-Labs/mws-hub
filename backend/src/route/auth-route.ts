import { Hono } from "hono";
import { AuthController } from "../controller/auth-controller";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const authRoute = new Hono<{ Variables: SessionVariables }>();

authRoute.get("/google/start", AuthController.startGoogleLogin);
authRoute.get("/google/callback", AuthController.googleCallback);
authRoute.post("/google", AuthController.loginWithGoogle);
authRoute.post("/logout", AuthController.logout);

// Front-channel logout. A satellite redirects the browser here after clearing
// its own session; Hub clears the cookie and sends the browser back.
authRoute.get("/logout", AuthController.logoutFromApp);
authRoute.get("/me", sessionAuthMiddleware, AuthController.me);
