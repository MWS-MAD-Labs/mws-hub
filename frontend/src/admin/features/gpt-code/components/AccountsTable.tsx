import type { ReactNode } from "react";
import type { AdminGptCodeAccount, AdminGptCodeMapping } from "@/admin/api/adminApi";
import Badge from "@/admin/components/ui/Badge";
import { Table, TBody, TD, TH, THead, TR } from "@/admin/components/ui/Table";
import type { Draft } from "../gptCodeDrafts";
import { draftFrom } from "../gptCodeDrafts";
import OfferedTo from "./OfferedTo";

export type AccountRowsProps = {
  accounts: AdminGptCodeAccount[];
  mappingOf: (cardId: string) => AdminGptCodeMapping | undefined;
  drafts: Record<string, Draft>;
  selected: string | null;
  unsavedOf: (cardId: string) => boolean;
  // The Edit button, or "Editing" for the open row.
  action: (account: AdminGptCodeAccount) => ReactNode;
};

export default function AccountsTable({ accounts, mappingOf, drafts, selected, unsavedOf, action }: AccountRowsProps) {
  return (
    <Table caption="GPT accounts" className="table-fixed">
      <THead>
        <TH className="w-[34%]">Account</TH>
        <TH>Offered to</TH>
        <TH className="w-28">Status</TH>
        <TH className="w-24"><span className="sr-only">Action</span></TH>
      </THead>
      <TBody>
        {accounts.map((account) => {
          const mapping = mappingOf(account.cardId);
          const active = mapping?.isActive ?? true;
          return (
            <TR key={account.cardId} selected={selected === account.cardId} muted={!active}>
              <TD>
                <p className="text-sm font-semibold text-[var(--admin-text)]">{account.cardId}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--admin-text-tertiary)]">{account.email}</p>
              </TD>
              <TD>
                <OfferedTo targets={(drafts[account.cardId] ?? draftFrom(mapping)).targets} active={active} mapped={Boolean(mapping)} unsaved={unsavedOf(account.cardId)} />
              </TD>
              <TD>
                <Badge tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
              </TD>
              <TD align="right">{action(account)}</TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
