import Badge from "@/admin/components/ui/Badge";
import { actionLabel } from "../auditLabels";

export default function AuditActionBadge({ action }: { action: string }) {
  return <Badge tone={action === "hub.login_denied" ? "danger" : "neutral"}>{actionLabel(action)}</Badge>;
}
