import { Hono } from "hono";
import { AdminController } from "../controller/admin-controller";
import { FeedbackController } from "../controller/feedback-controller";
import { ApplicationController } from "../controller/application-controller";
import { adminAuthMiddleware } from "../middleware/admin-auth-middleware";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import type { SessionVariables } from "../type/hono-context";

export const adminRoute = new Hono<{ Variables: SessionVariables }>();

adminRoute.use("*", sessionAuthMiddleware, adminAuthMiddleware);

adminRoute.get("/dashboard-data", AdminController.dashboard);

// Requirement 7: MAD Labs adds, edits and hides app cards from here instead
// of editing src/data/hub-catalog.ts and shipping a release. Requirement 8
// rides along - status is just a field on these rows.
adminRoute.get("/applications", ApplicationController.list);
adminRoute.post("/applications", ApplicationController.create);
adminRoute.patch("/applications/:id", ApplicationController.update);
adminRoute.delete("/applications/:id", ApplicationController.remove);
adminRoute.get("/reports", FeedbackController.reports);
adminRoute.patch("/reports/:id", FeedbackController.updateReport);
adminRoute.get("/access-requests", FeedbackController.accessRequests);
adminRoute.patch(
  "/access-requests/:id",
  FeedbackController.updateAccessRequest,
);
