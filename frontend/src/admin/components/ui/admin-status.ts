import { CheckCircle2, Clock3, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";
import type { AdminAccessRequest, AdminReport } from "@/admin/api/adminApi";

export type StatusMeta = { label: string; className: string; icon: LucideIcon };

export const REPORT_STATUS: Record<AdminReport["status"], StatusMeta> = {
  OPEN: { label: "Open", className: "bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)]", icon: TriangleAlert },
  IN_PROGRESS: { label: "In progress", className: "bg-[var(--admin-navy-soft)] text-[var(--admin-navy)]", icon: Clock3 },
  RESOLVED: { label: "Resolved", className: "bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)]", icon: CheckCircle2 },
};

export const ACCESS_STATUS: Record<AdminAccessRequest["status"], StatusMeta> = {
  PENDING: { label: "Pending", className: "bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)]", icon: Clock3 },
  APPROVED: { label: "Approved", className: "bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)]", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", className: "bg-[var(--admin-rose-soft)] text-[var(--admin-rose)]", icon: XCircle },
};
