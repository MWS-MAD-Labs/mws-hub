import type { Context } from "hono";
import * as AuditLogService from "../service/audit-log-service";
import type { SessionVariables } from "../type/hono-context";

export class AuditLogController {
  static async list(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: await AuditLogService.listAuditLogs() });
  }
}
