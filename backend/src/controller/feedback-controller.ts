import type { Context } from "hono";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import * as FeedbackService from "../service/feedback-service";
import { recordAuditLog } from "../service/audit-log-service";

function appId(c: Context) {
  const id = c.req.param("appId");
  if (!id) throw new ResponseError(400, "Application id is required.");
  return id;
}

export class FeedbackController {
  static async report(c: Context<{ Variables: SessionVariables }>) {
    const { message } = await c.req.json<{ message?: string }>();
    return c.json(
      {
        data: await FeedbackService.createReport(
          appId(c),
          c.var.user.email,
          message || "",
        ),
      },
      201,
    );
  }

  static async requestAccess(c: Context<{ Variables: SessionVariables }>) {
    const { reason } = await c.req.json<{ reason?: string }>();
    return c.json(
      {
        data: await FeedbackService.createAccessRequest(
          appId(c),
          c.var.user.email,
          reason,
        ),
      },
      201,
    );
  }

  static async reports(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await FeedbackService.listReports() });
  }

  static async accessRequests(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await FeedbackService.listAccessRequests() });
  }

  static async updateReport(c: Context<{ Variables: SessionVariables }>) {
    const { status } = await c.req.json<{
      status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
    }>();
    const report = await FeedbackService.updateReport(
      c.req.param("id") || "",
      status,
      c.var.user.email,
    );
    await recordAuditLog({
      actor: c.var.user,
      action: "app_report.update_status",
      entity: { type: "app_report", id: report.id },
      summary: `Updated report for ${report.application.name} to ${report.status}`,
      metadata: {
        status: report.status,
        application_id: report.application.id,
        application_name: report.application.name,
        reporter_email: report.reporter_email,
      },
    });
    return c.json({
      data: report,
    });
  }

  static async updateAccessRequest(
    c: Context<{ Variables: SessionVariables }>,
  ) {
    const { status, decisionNote } = await c.req.json<{
      status: "PENDING" | "APPROVED" | "REJECTED";
      decisionNote?: string;
    }>();
    const request = await FeedbackService.updateAccessRequest(
      c.req.param("id") || "",
      status,
      c.var.user.email,
      decisionNote,
    );
    await recordAuditLog({
      actor: c.var.user,
      action: "access_request.update_status",
      entity: { type: "access_request", id: request.id },
      summary: `Updated access request for ${request.application.name} to ${request.status}`,
      metadata: {
        status: request.status,
        application_id: request.application.id,
        application_name: request.application.name,
        requester_email: request.requester_email,
        decision_note: request.decision_note,
      },
    });
    return c.json({
      data: request,
    });
  }
}
