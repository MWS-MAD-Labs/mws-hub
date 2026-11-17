import type { AdminReport } from "@/admin/api/adminApi";
import Dropdown from "@/admin/components/ui/Dropdown";
import { REPORT_STATUS_OPTIONS, type ReportStatus } from "../reportStatus";

export type ReportChange = (id: string, status: ReportStatus) => Promise<void>;

export default function ReportStatusSelect({ report, updating, onChange, className }: { report: AdminReport; updating: boolean; onChange: ReportChange; className?: string }) {
  return (
    <Dropdown
      value={report.status}
      onChange={(value) => void onChange(report.id, value)}
      disabled={updating}
      options={REPORT_STATUS_OPTIONS}
      size="sm"
      ariaLabel={`Update ${report.application.name} report status`}
      className={className}
      align="right"
    />
  );
}
