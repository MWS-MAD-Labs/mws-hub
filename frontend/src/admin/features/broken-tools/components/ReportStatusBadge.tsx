import Badge from "@/admin/components/ui/Badge";
import { REPORT_STATUS, type ReportStatus } from "../reportStatus";

export default function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const meta = REPORT_STATUS[status];
  return <Badge tone={meta.tone} icon={meta.icon}>{meta.label}</Badge>;
}
