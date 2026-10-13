import { prisma } from "../lib/prisma";
import { ResponseError } from "../error/response-error";
import type {
  ReportStatus,
  AccessRequestStatus,
} from "../generated/prisma/enums";

export async function createReport(
  applicationId: string,
  reporterEmail: string,
  message: string,
) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, deleted_at: null },
  });
  if (!application) throw new ResponseError(404, "Unknown application.");
  if (!message?.trim())
    throw new ResponseError(400, "A problem description is required.");
  return prisma.appReport.create({
    data: {
      application_id: applicationId,
      reporter_email: reporterEmail,
      message: message.trim(),
    },
  });
}

export function listReports() {
  return prisma.appReport.findMany({
    include: { application: { select: { id: true, name: true } } },
    orderBy: { created_at: "desc" },
  });
}

export async function updateReport(
  id: string,
  status: ReportStatus,
  adminEmail: string,
) {
  if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status))
    throw new ResponseError(400, "Invalid report status.");
  return prisma.appReport.update({
    where: { id },
    data: {
      status,
      resolved_at: status === "RESOLVED" ? new Date() : null,
      resolved_by: status === "RESOLVED" ? adminEmail : null,
    },
    include: { application: { select: { id: true, name: true } } },
  });
}
