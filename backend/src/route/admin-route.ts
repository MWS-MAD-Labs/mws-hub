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

// Name, address and access of an application are changed in Central. The Hub keeps how a card is shown
// (status, whether it can be found, keywords) and removes older rows Central does not cover.
adminRoute.get("/api/display", ApplicationController.displayList);
adminRoute.put("/api/display/:id", ApplicationController.displayUpdate);
adminRoute.get("/api/catalog", ApplicationController.list);
adminRoute.delete("/api/catalog/:id", ApplicationController.remove);
adminRoute.get("/api/reports", FeedbackController.reports);
adminRoute.patch("/api/reports/:id", FeedbackController.updateReport);
adminRoute.get("/api/access-requests", FeedbackController.accessRequests);
adminRoute.patch(
  "/api/access-requests/:id",
  FeedbackController.updateAccessRequest,
);
adminRoute.get("/reports", FeedbackController.reports);
adminRoute.patch("/reports/:id", FeedbackController.updateReport);
adminRoute.get("/access-requests", FeedbackController.accessRequests);
adminRoute.patch(
  "/access-requests/:id",
  FeedbackController.updateAccessRequest,
);
