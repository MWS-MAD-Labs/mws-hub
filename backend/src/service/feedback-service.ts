import { prisma } from "../lib/prisma";
import { ResponseError } from "../error/response-error";
import { centralCatalogState } from "./central-catalog-service";
import type {
  ReportStatus,
  AccessRequestStatus,
} from "../generated/prisma/enums";

export async function createReport(
  applicationId: string,
  reporterEmail: string,
  message: string,
) {
  const state = await centralCatalogState();
  if (!state.read) throw new ResponseError(503, "Applications could not be read right now. Try again in a moment.");
  if (!state.entries.some((entry) => entry.id === applicationId)) throw new ResponseError(404, "Unknown application.");
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

// A report names its application as Central knows it now. One that Central no longer publishes keeps its id as the name.
async function withApplication<T extends { application_id: string }>(rows: T[]) {
  const names = new Map((await centralCatalogState()).entries.map((entry) => [entry.id, entry.name]));
  return rows.map((row) => ({ ...row, application: { id: row.application_id, name: names.get(row.application_id) ?? row.application_id } }));
}

export async function listReports() {
  return withApplication(await prisma.appReport.findMany({ orderBy: { created_at: "desc" } }));
}

export async function updateReport(
  id: string,
  status: ReportStatus,
  adminEmail: string,
) {
  if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status))
    throw new ResponseError(400, "Invalid report status.");
  const updated = await prisma.appReport.update({
    where: { id },
    data: {
      status,
      resolved_at: status === "RESOLVED" ? new Date() : null,
      resolved_by: status === "RESOLVED" ? adminEmail : null,
    },
  });
  return (await withApplication([updated]))[0]!;
}
