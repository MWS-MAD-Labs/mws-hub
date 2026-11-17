import type { AdminReport } from "@/admin/api/adminApi";
import { Table, TBody, TD, TH, THead, TR } from "@/admin/components/ui/Table";
import { formatReportDate } from "../reportStatus";
import ReportStatusBadge from "./ReportStatusBadge";
import ReportStatusSelect, { type ReportChange } from "./ReportStatusSelect";

export type ReportRowsProps = { reports: AdminReport[]; updatingIds: Set<string>; onChange: ReportChange };

export default function ReportsTable({ reports, updatingIds, onChange }: ReportRowsProps) {
  return (
    <Table caption="Broken-tool reports" minWidth={900}>
      <THead>
        <TH>Ticket</TH>
        <TH>Reporter</TH>
        <TH>Issue</TH>
        <TH>Status</TH>
        <TH>Reported</TH>
        <TH align="right">Manage</TH>
      </THead>
      <TBody>
        {reports.map((report) => (
          <TR key={report.id}>
            <TD>
              <p className="text-sm font-semibold text-[var(--admin-text)]">{report.application.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--admin-text-tertiary)]">#{report.id.slice(-6)} · {report.application.id}</p>
            </TD>
            <TD className="text-xs">{report.reporter_email}</TD>
            <TD className="max-w-md text-xs leading-5">{report.message}</TD>
            <TD><ReportStatusBadge status={report.status} /></TD>
            <TD className="whitespace-nowrap text-xs text-[var(--admin-text-tertiary)]">{formatReportDate(report.created_at)}</TD>
            <TD align="right">
              <ReportStatusSelect report={report} updating={updatingIds.has(report.id)} onChange={onChange} className="ml-auto w-36" />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
