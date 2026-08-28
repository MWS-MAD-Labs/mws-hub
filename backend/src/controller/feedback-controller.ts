import type { Context } from "hono";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import * as FeedbackService from "../service/feedback-service";

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
    return c.json({
      data: await FeedbackService.updateReport(
        c.req.param("id") || "",
        status,
        c.var.user.email,
      ),
    });
  }

  static async updateAccessRequest(
    c: Context<{ Variables: SessionVariables }>,
  ) {
    const { status, decisionNote } = await c.req.json<{
      status: "PENDING" | "APPROVED" | "REJECTED";
      decisionNote?: string;
    }>();
    return c.json({
      data: await FeedbackService.updateAccessRequest(
        c.req.param("id") || "",
        status,
        c.var.user.email,
        decisionNote,
      ),
    });
  }
}
