import type { AdminAuditLog } from "@/admin/api/adminApi";
import { Table, TBody, TD, TH, THead, TR } from "@/admin/components/ui/Table";
import { formatAuditDate } from "../auditLabels";
import AuditActionBadge from "./AuditActionBadge";
import AuditMetadata from "./AuditMetadata";

export default function AuditTable({ logs }: { logs: AdminAuditLog[] }) {
  return (
    <Table caption="MWS Hub audit logs" minWidth={900}>
      <THead>
        <TH>Time</TH>
        <TH>Actor</TH>
        <TH>Action</TH>
        <TH>Target</TH>
        <TH>Summary</TH>
        <TH>Details</TH>
      </THead>
      <TBody>
        {logs.map((log) => (
          <TR key={log.id} className="align-top">
            <TD className="whitespace-nowrap align-top text-xs text-[var(--admin-text-tertiary)]">{formatAuditDate(log.created_at)}</TD>
            <TD className="align-top">
              <p className="text-sm font-semibold text-[var(--admin-text)]">{log.actor_name || log.actor_email}</p>
              <p className="mt-0.5 text-xs text-[var(--admin-text-tertiary)]">{log.actor_email}</p>
            </TD>
            <TD className="align-top"><AuditActionBadge action={log.action} /></TD>
            <TD className="align-top">
              <p className="text-xs font-semibold text-[var(--admin-text)]">{log.entity_type}</p>
              <p className="mt-0.5 max-w-40 truncate font-mono text-[11px] text-[var(--admin-text-tertiary)]">{log.entity_id}</p>
            </TD>
            <TD className="max-w-md align-top text-xs leading-5">{log.summary}</TD>
            <TD className="align-top"><AuditMetadata log={log} /></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
