import { X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { adminApi, type AdminGptCodeAccount, type AdminGptCodeConfiguration, type AdminGptCodeException, type AdminGptCodeMapping } from "@/admin/api/adminApi";
import Autocomplete from "@/admin/components/ui/Autocomplete";
import Badge from "@/admin/components/ui/Badge";
import Button from "@/admin/components/ui/Button";
import Dropdown from "@/admin/components/ui/Dropdown";
import PanelHeader from "@/admin/components/ui/PanelHeader";
import Switch from "@/admin/components/ui/Switch";
import { cn } from "@/lib/utils";
import { KINDS, KIND_LABEL, changesOf, keyOf, type Draft } from "../gptCodeDrafts";
import { peopleOptions } from "../people";

type EditPanelProps = {
  account: AdminGptCodeAccount;
  mapping: AdminGptCodeMapping | undefined;
  draft: Draft;
  configuration: AdminGptCodeConfiguration;
  saving: boolean;
  saveError: string;
  onChange: (change: Partial<Draft>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
  onExceptionsChanged: () => Promise<void>;
};

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="px-5 py-4">
      <div className="mb-2">
        <h3 id={id} className="text-sm font-semibold text-[var(--admin-text)]">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-[var(--admin-text-tertiary)]">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

// Rules, active switch and exceptions of one account. The same docked or in the sheet.
export default function EditPanel({ account, mapping, draft, configuration, saving, saveError, onChange, onSave, onDiscard, onClose, onExceptionsChanged }: EditPanelProps) {
  const [exceptionEmail, setExceptionEmail] = useState("");
  const [exceptionBusy, setExceptionBusy] = useState<string | null>(null);

  const editable = configuration.centralAvailable && !saving;
  const changes = changesOf(draft, mapping);
  const savedKeys = new Set((mapping?.targets ?? []).map(keyOf));
  const chosen = new Set(draft.targets.map(keyOf));
  const valueOptions = configuration.targets[draft.addKind].map((option) => ({
    value: option.id,
    label: option.label,
    disabled: chosen.has(`${draft.addKind}:${option.id}`),
  }));
  // Saving with no rules left unassigns the card, which needs a saved mapping.
  const canSave = editable && changes > 0 && (draft.targets.length > 0 || Boolean(mapping));

  const exceptions = configuration.exceptions.filter((exception) => exception.action === "assign" && exception.cardId === account.cardId);
  const typedEmail = exceptionEmail.trim().toLowerCase();
  const existingElsewhere = configuration.exceptions.find(
    (exception) => exception.email === typedEmail && !(exception.action === "assign" && exception.cardId === account.cardId),
  );
  const id = (part: string) => `gpt-${part}-${account.cardId}`;
  const people = useMemo(() => peopleOptions(configuration.people), [configuration.people]);
  const nameOf = (email: string) => configuration.people.find((person) => person.email === email)?.name;

  function addRule() {
    const option = configuration.targets[draft.addKind].find((item) => item.id === draft.addId);
    if (!option) return;
    const target = { type: draft.addKind, id: option.id, name: option.label };
    if (chosen.has(keyOf(target))) return;
    onChange({ targets: [...draft.targets, target], addId: "" });
  }

  async function addException() {
    if (!exceptionEmail.trim()) return;
    setExceptionBusy("new");
    try {
      await adminApi.saveGptCodeException({ email: exceptionEmail.trim(), action: "assign", cardId: account.cardId });
      toast.success(`Exception saved for ${typedEmail}`);
      setExceptionEmail("");
      await onExceptionsChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Exception could not be saved.");
    } finally {
      setExceptionBusy(null);
    }
  }

  async function removeException(exception: AdminGptCodeException) {
    setExceptionBusy(exception.id);
    try {
      await adminApi.deleteGptCodeException(exception.id);
      toast.success(`Exception removed for ${exception.email}`);
      await onExceptionsChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Exception could not be removed.");
    } finally {
      setExceptionBusy(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title={`Edit ${account.cardId}`} subtitle={account.email} onClose={onClose} closeLabel={`Close editing ${account.cardId}`} />

      <div className="min-h-0 flex-1 divide-y divide-[var(--admin-border)] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <label htmlFor={id("active")} className="text-sm font-semibold text-[var(--admin-text)]">Active</label>
            <p className="text-xs text-[var(--admin-text-tertiary)]">{draft.isActive ? "Offered to the rules below." : "Not offered to anyone."}</p>
          </div>
          <Switch id={id("active")} checked={draft.isActive} disabled={saving} onCheckedChange={(isActive) => onChange({ isActive })} />
        </div>

        <Section id={id("offered")} title="Offered to">
          {draft.targets.length > 0 ? (
            <ul className="divide-y divide-[var(--admin-border)] rounded-md border border-[var(--admin-border)]">
              {draft.targets.map((target) => {
                const unsaved = !savedKeys.has(keyOf(target));
                return (
                  <li key={keyOf(target)} className={cn("flex items-center gap-3 py-1.5 pl-3 pr-1.5", unsaved && "bg-[var(--admin-gold-soft)]")}>
                    <span className="w-24 shrink-0 text-xs text-[var(--admin-text-tertiary)]">{KIND_LABEL[target.type]}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--admin-text)]">{target.name}</span>
                    {unsaved ? <Badge tone="warning">Unsaved</Badge> : null}
                    <Button variant="ghost" size="sm" iconOnly disabled={!editable} onClick={() => onChange({ targets: draft.targets.filter((item) => keyOf(item) !== keyOf(target)) })} aria-label={`Remove ${KIND_LABEL[target.type]} ${target.name}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--admin-text-tertiary)]">Not offered yet</p>
          )}

          <div className="mt-3 grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
            <Dropdown value={draft.addKind} options={KINDS} disabled={!editable} ariaLabel="Rule type" onChange={(addKind) => onChange({ addKind, addId: "" })} />
            <Dropdown value={draft.addId || undefined} options={valueOptions} placeholder={configuration.centralAvailable ? `Choose a ${KIND_LABEL[draft.addKind].toLowerCase()}` : "Central unavailable"} disabled={!editable || valueOptions.length === 0} ariaLabel={KIND_LABEL[draft.addKind]} onChange={(addId) => onChange({ addId })} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button disabled={!editable || !draft.addId} onClick={addRule}>Add rule</Button>
          </div>
        </Section>

        <Section id={id("exceptions")} title="Exceptions" hint="People who get this account no matter which rules match.">
          {exceptions.length > 0 ? (
            <ul className="mb-2 divide-y divide-[var(--admin-border)] rounded-md border border-[var(--admin-border)]">
              {exceptions.map((exception) => (
                <li key={exception.id} className="flex items-center gap-3 py-1.5 pl-3 pr-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--admin-text)]">{nameOf(exception.email) ?? exception.email}</p>
                    <p className="truncate text-xs text-[var(--admin-text-tertiary)]">
                      {nameOf(exception.email) ? exception.email : null}
                      {nameOf(exception.email) && exception.note ? " · " : null}
                      {exception.note}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" iconOnly disabled={exceptionBusy !== null} onClick={() => void removeException(exception)} aria-label={`Remove the exception for ${exception.email}`}>
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <form className="flex items-start gap-2" onSubmit={(event) => { event.preventDefault(); void addException(); }}>
            <Autocomplete
              value={exceptionEmail}
              onChange={setExceptionEmail}
              options={people}
              placeholder="Type a name or email"
              aria-label={`Person to give ${account.cardId}`}
              emptyText="No one in Central matches. You can still add an email."
              hintTone="warning"
              hint={existingElsewhere ? `This email already has an exception (${existingElsewhere.action === "block" ? "blocked" : existingElsewhere.cardId}). Adding it here replaces that.` : undefined}
            />
            <Button type="submit" loading={exceptionBusy === "new"} disabled={exceptionBusy !== null || !exceptionEmail.trim()}>Add</Button>
          </form>
        </Section>
      </div>

      <footer className="border-t border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-5 py-3">
        {saveError ? <p role="alert" className="mb-2 text-sm text-[var(--admin-rose)]">{saveError}</p> : null}
        {changes > 0 && draft.targets.length === 0 && !mapping ? <p className="mb-2 text-xs text-[var(--admin-text-tertiary)]">Add at least one rule to save.</p> : null}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" disabled={changes === 0 || saving} onClick={onDiscard}>Discard</Button>
          <Button variant="primary" loading={saving} disabled={!canSave} onClick={onSave}>
            {saving ? "Saving" : changes === 0 ? "No changes" : `Save ${changes} ${changes === 1 ? "change" : "changes"}`}
          </Button>
        </div>
      </footer>
    </div>
  );
}
