import type { AdminAuditLog } from "@/admin/api/adminApi";

export default function AuditMetadata({ log }: { log: AdminAuditLog }) {
  if (!log.metadata) return <span className="text-xs text-[var(--admin-text-tertiary)]">None</span>;
  return (
    <details>
      <summary className="admin-focus cursor-pointer rounded-sm text-xs font-semibold text-[var(--admin-brand)]">View metadata</summary>
      <pre className="mt-2 max-h-64 max-w-lg overflow-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] p-3 text-xs text-[var(--admin-text-secondary)]">{JSON.stringify(log.metadata, null, 2)}</pre>
    </details>
  );
}
