import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminApi, type AdminGptCodeConfiguration, type AdminGptCodeException } from "@/admin/api/adminApi";
import Autocomplete from "@/admin/components/ui/Autocomplete";
import Badge from "@/admin/components/ui/Badge";
import Button from "@/admin/components/ui/Button";
import Dropdown from "@/admin/components/ui/Dropdown";
import { EmptyState } from "@/admin/components/ui/States";
import { Table, TBody, TD, TH, THead, TR } from "@/admin/components/ui/Table";
import TextField from "@/admin/components/ui/TextField";
import { peopleOptions } from "../people";

const BLOCK = "block";

// Every exception, assign and block. The only place a person can be blocked.
export default function ExceptionsPanel({ configuration, onChanged }: { configuration: AdminGptCodeConfiguration; onChanged: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [choice, setChoice] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const choiceOptions = [
    ...configuration.accounts.map((account) => ({ value: account.cardId, label: `${account.cardId} · ${account.email}` })),
    { value: BLOCK, label: "Block from GPT Code" },
  ];
  const people = useMemo(() => peopleOptions(configuration.people), [configuration.people]);
  const nameOf = (email: string) => configuration.people.find((person) => person.email === email)?.name;
  const accountEmail = (cardId: string | null) => configuration.accounts.find((account) => account.cardId === cardId)?.email ?? "";

  async function add() {
    if (!email.trim() || !choice) return;
    setBusy("new");
    try {
      await adminApi.saveGptCodeException({
        email: email.trim(),
        action: choice === BLOCK ? "block" : "assign",
        cardId: choice === BLOCK ? undefined : choice,
        note: note.trim() || undefined,
      });
      toast.success(`Exception saved for ${email.trim().toLowerCase()}`);
      setEmail("");
      setChoice("");
      setNote("");
      await onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Exception could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(exception: AdminGptCodeException) {
    setBusy(exception.id);
    try {
      await adminApi.deleteGptCodeException(exception.id);
      toast.success(`Exception removed for ${exception.email}`);
      await onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Exception could not be removed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <form className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <Autocomplete value={email} onChange={setEmail} options={people} placeholder="Type a name or email" aria-label="Person" emptyText="No one in Central matches. You can still add an email." />
        <Dropdown value={choice || undefined} options={choiceOptions} placeholder="Choose an account or block" ariaLabel="Account to assign, or block" onChange={setChoice} />
        <TextField type="text" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" aria-label="Note" />
        <Button type="submit" variant="primary" loading={busy === "new"} disabled={busy !== null || !email.trim() || !choice}>Add</Button>
      </form>

      <div className="mt-4 overflow-hidden rounded-md border border-[var(--admin-border)]">
        {configuration.exceptions.length === 0 ? (
          <EmptyState title="No exceptions">Everyone follows the rules.</EmptyState>
        ) : (
          <Table caption="GPT Code exceptions" className="table-fixed">
            <THead>
              <TH>Person</TH>
              <TH className="w-32">Exception</TH>
              <TH className="hidden sm:table-cell">Note</TH>
              <TH className="w-14"><span className="sr-only">Action</span></TH>
            </THead>
            <TBody>
              {configuration.exceptions.map((exception) => (
                <TR key={exception.id}>
                  <TD className="truncate">
                    <p className="truncate font-medium text-[var(--admin-text)]">{nameOf(exception.email) ?? exception.email}</p>
                    {nameOf(exception.email) ? <p className="truncate text-xs text-[var(--admin-text-tertiary)]">{exception.email}</p> : null}
                  </TD>
                  <TD>{exception.action === "block" ? <Badge tone="danger">Blocked</Badge> : <span title={accountEmail(exception.cardId)}>{exception.cardId}</span>}</TD>
                  <TD className="hidden truncate text-[var(--admin-text-tertiary)] sm:table-cell">{exception.note || "-"}</TD>
                  <TD align="right" className="py-2 pr-3">
                    <Button variant="ghost" size="sm" iconOnly disabled={busy !== null} onClick={() => void remove(exception)} aria-label={`Remove the exception for ${exception.email}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
