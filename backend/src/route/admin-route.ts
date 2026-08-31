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

// Requirement 7: MAD Labs adds, edits and hides app cards from here instead
// of editing a source-code catalog and shipping a release. Requirement 8
// rides along - status is just a field on these rows.
adminRoute.get("/catalog", ApplicationController.list);
adminRoute.post("/catalog", ApplicationController.create);
adminRoute.get("/catalog/:id", ApplicationController.get);
adminRoute.patch("/catalog/:id", ApplicationController.update);
adminRoute.delete("/catalog/:id", ApplicationController.remove);
adminRoute.get("/api/catalog", ApplicationController.list);
adminRoute.post("/api/catalog", ApplicationController.create);
adminRoute.get("/api/catalog/:id", ApplicationController.get);
adminRoute.patch("/api/catalog/:id", ApplicationController.update);
adminRoute.delete("/api/catalog/:id", ApplicationController.remove);
adminRoute.get("/applications", ApplicationController.list);
adminRoute.post("/applications", ApplicationController.create);
adminRoute.get("/applications/:id", ApplicationController.get);
adminRoute.patch("/applications/:id", ApplicationController.update);
adminRoute.delete("/applications/:id", ApplicationController.remove);
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
