import Badge from "@/admin/components/ui/Badge";
import { cn } from "@/lib/utils";
import { draftFrom } from "../gptCodeDrafts";
import type { AccountRowsProps } from "./AccountsTable";
import OfferedTo from "./OfferedTo";

export default function AccountsMobileList({ accounts, mappingOf, drafts, selected, unsavedOf, action }: AccountRowsProps) {
  return (
    <ul className="divide-y divide-[var(--admin-border)]">
      {accounts.map((account) => {
        const mapping = mappingOf(account.cardId);
        const active = mapping?.isActive ?? true;
        return (
          <li key={account.cardId} className={cn("space-y-2 p-4", selected === account.cardId && "bg-[var(--admin-brand-soft)]", !active && "opacity-70")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--admin-text)]">{account.cardId}</p>
                <p className="truncate text-xs text-[var(--admin-text-tertiary)]">{account.email}</p>
              </div>
              <Badge tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
            </div>
            <OfferedTo targets={(drafts[account.cardId] ?? draftFrom(mapping)).targets} active={active} mapped={Boolean(mapping)} unsaved={unsavedOf(account.cardId)} />
            <div className="flex justify-end">{action(account)}</div>
          </li>
        );
      })}
    </ul>
  );
}
