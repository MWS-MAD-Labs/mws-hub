import { CheckCircle2, Clock3, TriangleAlert, type LucideIcon } from "lucide-react";
import type { AdminReport } from "@/admin/api/adminApi";
import type { Tone } from "@/admin/components/ui/styles";

export type ReportStatus = AdminReport["status"];

export const REPORT_STATUSES: ReportStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  OPEN: { label: "Open", tone: "warning", icon: TriangleAlert },
  IN_PROGRESS: { label: "In progress", tone: "info", icon: Clock3 },
  RESOLVED: { label: "Resolved", tone: "success", icon: CheckCircle2 },
};

export const REPORT_STATUS_OPTIONS = REPORT_STATUSES.map((value) => ({ value, label: REPORT_STATUS[value].label }));

export const formatReportDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
