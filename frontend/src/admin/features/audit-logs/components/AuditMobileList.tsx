import type { AdminAuditLog } from "@/admin/api/adminApi";
import { formatAuditDate } from "../auditLabels";
import AuditActionBadge from "./AuditActionBadge";
import AuditMetadata from "./AuditMetadata";

export default function AuditMobileList({ logs }: { logs: AdminAuditLog[] }) {
  return (
    <div className="divide-y divide-[var(--admin-border)]">
      {logs.map((log) => (
        <article key={log.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <AuditActionBadge action={log.action} />
              <p className="mt-2 text-sm font-semibold text-[var(--admin-text)]">{log.summary}</p>
            </div>
            <time className="shrink-0 text-[11px] text-[var(--admin-text-tertiary)]">{formatAuditDate(log.created_at)}</time>
          </div>
          <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">{log.actor_name || log.actor_email} · {log.entity_type}</p>
          <div className="mt-2"><AuditMetadata log={log} /></div>
        </article>
      ))}
    </div>
  );
}
