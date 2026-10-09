import type { Context } from "hono";
import * as AuditLogService from "../service/audit-log-service";
import type { SessionVariables } from "../type/hono-context";

export class AuditLogController {
  static async list(c: Context<{ Variables: SessionVariables }>) {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(c.req.query("pageSize")) || 10));
    const q = c.req.query("q") || undefined;
    const action = c.req.query("action") || undefined;
    const dateFromRaw = c.req.query("dateFrom");
    const dateToRaw = c.req.query("dateTo");
    if (Boolean(dateFromRaw) !== Boolean(dateToRaw)) return c.json({ errors: "dateFrom and dateTo must be provided together." }, 400);
    let dateFrom: Date | undefined;
    let dateToExclusive: Date | undefined;
    if (dateFromRaw && dateToRaw) {
      const from = parseJakartaDate(dateFromRaw);
      const to = parseJakartaDate(dateToRaw);
      if (!from || !to) return c.json({ errors: "Dates must use YYYY-MM-DD." }, 400);
      const dayDifference = Math.round((to.localMidnight - from.localMidnight) / 86_400_000);
      if (dayDifference < 0) return c.json({ errors: "dateFrom must be before or equal to dateTo." }, 400);
      if (dayDifference > 30) return c.json({ errors: "Date range cannot exceed 30 days." }, 400);
      dateFrom = from.instant;
      dateToExclusive = new Date(to.instant.getTime() + 86_400_000);
    }
    const { rows, total } = await AuditLogService.listAuditLogs({ page, pageSize, q, action, dateFrom, dateToExclusive });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return c.json({
      data: rows,
      meta: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    });
  }
}

function parseJakartaDate(value: string): { instant: Date; localMidnight: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const localMidnight = Date.UTC(year, month - 1, day);
  const check = new Date(localMidnight);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { localMidnight, instant: new Date(localMidnight - 7 * 60 * 60 * 1000) };
}
