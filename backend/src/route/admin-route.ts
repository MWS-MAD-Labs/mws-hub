import { Hono } from "hono";
import { AdminController } from "../controller/admin-controller";
import { adminAuthMiddleware } from "../middleware/admin-auth-middleware";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const adminRoute = new Hono<{ Variables: SessionVariables }>();

adminRoute.use("*", sessionAuthMiddleware, adminAuthMiddleware);

adminRoute.get("/dashboard-data", AdminController.dashboard);
