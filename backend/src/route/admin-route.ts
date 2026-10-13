import { Hono } from "hono";
import { AdminController } from "../controller/admin-controller";
import { AuditLogController } from "../controller/audit-log-controller";
import { FeedbackController } from "../controller/feedback-controller";
import { ApplicationController } from "../controller/application-controller";
import { adminAuthMiddleware } from "../middleware/admin-auth-middleware";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const adminRoute = new Hono<{ Variables: SessionVariables }>();

adminRoute.use("*", sessionAuthMiddleware, adminAuthMiddleware);

adminRoute.get("/dashboard-data", AdminController.dashboard);
adminRoute.get("/access-options", AdminController.accessOptions);
adminRoute.get("/api/access-options", AdminController.accessOptions);
adminRoute.get("/audit-logs", AuditLogController.list);
adminRoute.get("/api/audit-logs", AuditLogController.list);

// Applications are managed in Central, card status and keywords included. What is left here is older Hub rows that
// Central does not cover, which can be listed and removed.
adminRoute.get("/api/catalog", ApplicationController.list);
adminRoute.delete("/api/catalog/:id", ApplicationController.remove);
adminRoute.get("/api/reports", FeedbackController.reports);
adminRoute.patch("/api/reports/:id", FeedbackController.updateReport);
adminRoute.get("/reports", FeedbackController.reports);
adminRoute.patch("/reports/:id", FeedbackController.updateReport);
