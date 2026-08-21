import { Hono } from "hono";
import { AppsController } from "../controller/apps-controller";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const appsRoute = new Hono<{ Variables: SessionVariables }>();

appsRoute.get("/", sessionAuthMiddleware, AppsController.list);
appsRoute.get("/:appId/launch", sessionAuthMiddleware, AppsController.launch);
