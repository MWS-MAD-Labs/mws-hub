import { CheckCircle2, CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NoticeTone = "info" | "success" | "warning" | "error";

const NOTICE: Record<NoticeTone, { className: string; icon: LucideIcon; iconClass: string }> = {
  info: { className: "border-[var(--admin-navy)]/20 bg-[var(--admin-navy-soft)]", icon: Info, iconClass: "text-[var(--admin-navy)]" },
  success: { className: "border-[var(--admin-sage)]/30 bg-[var(--admin-sage-soft)]", icon: CheckCircle2, iconClass: "text-[var(--admin-sage-text)]" },
  warning: { className: "border-[var(--admin-gold)]/35 bg-[var(--admin-gold-soft)]", icon: TriangleAlert, iconClass: "text-[var(--admin-gold-text)]" },
  error: { className: "border-[var(--admin-rose)]/30 bg-[var(--admin-rose-soft)]", icon: CircleAlert, iconClass: "text-[var(--admin-rose)]" },
};

// An inline banner: what happened, and optionally what to do about it.
export default function Notice({ tone = "info", title, children, action, className }: { tone?: NoticeTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const { className: toneClass, icon: Icon, iconClass } = NOTICE[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border px-4 py-3", toneClass, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-semibold text-[var(--admin-text)]">{title}</p> : null}
        {children ? <div className={cn("text-[var(--admin-text-secondary)]", title && "mt-0.5")}>{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
