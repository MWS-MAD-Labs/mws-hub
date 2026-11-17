import { formatReportDate } from "../reportStatus";
import type { ReportRowsProps } from "./ReportsTable";
import ReportStatusBadge from "./ReportStatusBadge";
import ReportStatusSelect from "./ReportStatusSelect";

export default function ReportMobileList({ reports, updatingIds, onChange }: ReportRowsProps) {
  return (
    <div className="divide-y divide-[var(--admin-border)]">
      {reports.map((report) => (
        <article key={report.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--admin-text)]">{report.application.name}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--admin-text-tertiary)]">{report.reporter_email}</p>
            </div>
            <ReportStatusBadge status={report.status} />
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--admin-text-secondary)]">{report.message}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <time className="text-[11px] text-[var(--admin-text-tertiary)]">{formatReportDate(report.created_at)}</time>
            <ReportStatusSelect report={report} updating={updatingIds.has(report.id)} onChange={onChange} className="w-36" />
          </div>
        </article>
      ))}
    </div>
  );
}
