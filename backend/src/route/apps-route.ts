import { Hono } from "hono";
import type { Context, Next } from "hono";
import { AppsController } from "../controller/apps-controller";
import { FeedbackController } from "../controller/feedback-controller";
import { ResponseError } from "../error/response-error";
import { frontendOrigin } from "../lib/frontend-origin";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const appsRoute = new Hono<{ Variables: SessionVariables }>();

async function launchSessionAuthMiddleware(
  c: Context<{ Variables: SessionVariables }>,
  next: Next,
) {
  try {
    await sessionAuthMiddleware(c, next);
  } catch (error) {
    if (error instanceof ResponseError && error.status === 401) {
      const params = new URLSearchParams({
        error: "session_expired",
        redirect: c.req.path,
      });
      return c.redirect(`${frontendOrigin()}/login?${params}`, 302);
    }
    throw error;
  }
}

appsRoute.get("/", sessionAuthMiddleware, AppsController.list);
appsRoute.post(
  "/:appId/report",
  sessionAuthMiddleware,
  FeedbackController.report,
);
appsRoute.post(
  "/:appId/request-access",
  sessionAuthMiddleware,
  FeedbackController.requestAccess,
);
appsRoute.get(
  "/:appId/launch",
  launchSessionAuthMiddleware,
  AppsController.launch,
);
