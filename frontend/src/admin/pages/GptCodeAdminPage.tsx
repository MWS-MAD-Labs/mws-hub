import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, RefreshCw, Save, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { adminApi, type AdminGptCodeConfiguration } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import Dropdown from "@/admin/components/ui/Dropdown";
import { cn } from "@/lib/utils";

type Draft = { unitId: string; isActive: boolean };

function draftsFrom(configuration: AdminGptCodeConfiguration): Record<string, Draft> {
  return Object.fromEntries(
    configuration.accounts.map((account) => {
      const mapping = configuration.mappings.find((item) => item.cardId === account.cardId);
      return [
        account.cardId,
        { unitId: mapping?.unitId ?? "", isActive: mapping?.isActive ?? true },
      ];
    }),
  );
}

export default function GptCodeAdminPage() {
  const [configuration, setConfiguration] = useState<AdminGptCodeConfiguration | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCard, setSavingCard] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await adminApi.gptCodeConfiguration();
      setConfiguration(next);
      setDrafts(draftsFrom(next));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "GPT Code configuration could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const assignedUnits = useMemo(
    () => new Map(configuration?.mappings.map((mapping) => [mapping.unitId, mapping.cardId]) ?? []),
    [configuration],
  );

  async function save(cardId: string) {
    const draft = drafts[cardId];
    if (!draft?.unitId) {
      toast.error("Choose a Central unit first.");
      return;
    }

    setSavingCard(cardId);
    try {
      await adminApi.saveGptCodeMapping(cardId, draft.unitId, draft.isActive);
      toast.success(`${cardId} mapping saved`);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Mapping could not be saved.");
    } finally {
      setSavingCard(null);
    }
  }

  async function unassign(cardId: string) {
    setSavingCard(cardId);
    try {
      await adminApi.deleteGptCodeMapping(cardId);
      toast.success(`${cardId} is now unassigned`);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Mapping could not be removed.");
    } finally {
      setSavingCard(null);
    }
  }

  return (
    <AppShell>
      <section className="-mx-4 -my-6 min-h-[calc(100vh-3.75rem)] bg-[var(--admin-bg)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1180px]">
          <header className="flex flex-col gap-5 border-b border-[var(--admin-border-strong)] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="admin-heading text-3xl font-extrabold tracking-[-0.035em] text-[var(--admin-text)] sm:text-4xl">GPT Code access</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-secondary)]">Assign each fixed ChatGPT account to one Central unit. A staff member can only read the account assigned to their current unit.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="admin-focus admin-heading inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-4 text-xs font-bold text-[var(--admin-text)] disabled:opacity-60">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </header>

          {loading && !configuration ? (
            <div className="mt-7 overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
              {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-24 animate-pulse border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)] last:border-b-0" />)}
            </div>
          ) : error ? (
            <div role="alert" className="mt-7 rounded-2xl border border-[var(--admin-rose)]/30 bg-[var(--admin-rose-soft)] p-5">
              <p className="admin-heading font-bold text-[var(--admin-rose)]">Configuration could not load</p>
              <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{error}</p>
              <button type="button" onClick={() => void load()} className="admin-focus admin-heading mt-4 text-xs font-bold text-[var(--admin-brand)] hover:underline">Try again</button>
            </div>
          ) : configuration ? (
            <div className="mt-7">
              <div className={cn("mb-4 flex items-start gap-3 rounded-xl border px-4 py-3", configuration.centralAvailable ? "border-[var(--admin-sage)]/30 bg-[var(--admin-sage-soft)]" : "border-[var(--admin-gold)]/30 bg-[var(--admin-gold-soft)]")}>
                {configuration.centralAvailable ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-sage-text)]" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-gold-text)]" />}
                <div>
                  <p className="admin-heading text-xs font-bold text-[var(--admin-text)]">{configuration.centralAvailable ? "Apps Script and Central are connected" : "Central units are unavailable"}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-text-secondary)]">{configuration.centralAvailable ? `${configuration.accounts.length} GPT accounts available. Changes take effect on the next code request.` : "Existing mappings remain active, but new assignments cannot be saved until Central responds."}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]">
                <div className="hidden grid-cols-[minmax(12rem,1fr)_minmax(15rem,1.2fr)_8rem_11rem] gap-5 border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-6 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-text-tertiary)] md:grid">
                  <span>GPT account</span><span>Central unit</span><span>Access</span><span className="text-right">Actions</span>
                </div>

                {configuration.accounts.map((account) => {
                  const mapping = configuration.mappings.find((item) => item.cardId === account.cardId);
                  const draft = drafts[account.cardId] ?? { unitId: "", isActive: true };
                  const busy = savingCard === account.cardId;
                  const dirty = draft.unitId !== (mapping?.unitId ?? "") || draft.isActive !== (mapping?.isActive ?? true);
                  const options = configuration.units.map((unit) => ({
                    value: unit.unitId,
                    label: unit.label,
                    disabled: Boolean(assignedUnits.get(unit.unitId) && assignedUnits.get(unit.unitId) !== account.cardId),
                  }));

                  return (
                    <div key={account.cardId} className="grid gap-4 border-b border-[var(--admin-border)] px-5 py-5 last:border-b-0 md:grid-cols-[minmax(12rem,1fr)_minmax(15rem,1.2fr)_8rem_11rem] md:items-center md:gap-5 md:px-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"><KeyRound className="h-4.5 w-4.5" /></span>
                        <div className="min-w-0">
                          <p className="admin-heading text-sm font-bold text-[var(--admin-text)]">{account.cardId}</p>
                          <p className="mt-0.5 truncate text-xs text-[var(--admin-text-tertiary)]">{account.email}</p>
                        </div>
                      </div>

                      <div>
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-text-tertiary)] md:hidden">Central unit</span>
                        <Dropdown value={draft.unitId || undefined} options={options} placeholder={configuration.centralAvailable ? "Choose a unit" : "Central unavailable"} disabled={!configuration.centralAvailable || busy} ariaLabel={`Unit assigned to ${account.cardId}`} onChange={(unitId) => setDrafts((current) => ({ ...current, [account.cardId]: { ...draft, unitId } }))} />
                      </div>

                      <label className="admin-focus flex w-fit cursor-pointer items-center gap-2 rounded-md text-xs font-semibold text-[var(--admin-text-secondary)]">
                        <input type="checkbox" checked={draft.isActive} disabled={busy} onChange={(event) => setDrafts((current) => ({ ...current, [account.cardId]: { ...draft, isActive: event.target.checked } }))} className="h-4 w-4 accent-[var(--admin-brand)]" />
                        Active
                      </label>

                      <div className="flex items-center gap-2 md:justify-end">
                        {mapping ? <button type="button" disabled={busy} onClick={() => void unassign(account.cardId)} className="admin-focus inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border-strong)] text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-rose-soft)] hover:text-[var(--admin-rose)] disabled:opacity-50" aria-label={`Unassign ${account.cardId}`}><Trash2 className="h-4 w-4" /></button> : null}
                        <button type="button" disabled={busy || !draft.unitId || (!dirty && Boolean(mapping))} onClick={() => void save(account.cardId)} className="admin-focus admin-heading inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#241718]"><Save className="h-3.5 w-3.5" />{busy ? "Saving" : "Save"}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
