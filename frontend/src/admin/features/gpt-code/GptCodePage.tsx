import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { toast } from "sonner";
import { adminApi, type AdminGptCodeAccount, type AdminGptCodeConfiguration } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import AdminConfirmDialog from "@/admin/components/ui/AdminConfirmDialog";
import Button from "@/admin/components/ui/Button";
import Card from "@/admin/components/ui/Card";
import PageHeader from "@/admin/components/ui/PageHeader";
import Sheet from "@/admin/components/ui/Sheet";
import { EmptyState, ErrorState, LoadingState } from "@/admin/components/ui/States";
import { cn } from "@/lib/utils";
import AccountsMobileList from "./components/AccountsMobileList";
import AccountsTable from "./components/AccountsTable";
import ConnectionStatus from "./components/ConnectionStatus";
import EditPanel from "./components/EditPanel";
import ExceptionsDialog from "./components/ExceptionsDialog";
import HowRulesDialog from "./components/HowRulesDialog";
import { changesOf, draftFrom, draftsFrom, type Draft } from "./gptCodeDrafts";

// The editor sits beside the table when both fit; narrower, it is a sheet.
const PANEL_WIDTH = 400;
const DOCK_MIN_WIDTH = PANEL_WIDTH + 64 + 640;

type Pending = { kind: "select"; next: string | null } | { kind: "refresh" };

export default function GptCodePage() {
  const [configuration, setConfiguration] = useState<AdminGptCodeConfiguration | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [docked, setDocked] = useState(true);

  const layoutRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const editButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousSelected = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  // keepSelected keeps the open card's unsaved rules across a reload, e.g.
  // after an exception changes. Only the open card can have any.
  const load = useCallback(async (keepSelected = false) => {
    setLoading(true);
    setError("");
    try {
      const next = await adminApi.gptCodeConfiguration();
      setConfiguration(next);
      setDrafts((current) => {
        const fresh = draftsFrom(next);
        const open = selectedRef.current;
        return keepSelected && open && current[open] && fresh[open] ? { ...fresh, [open]: current[open] } : fresh;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "GPT Code configuration could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useLayoutEffect(() => {
    const element = layoutRef.current;
    if (!element) return;
    setDocked(element.getBoundingClientRect().width >= DOCK_MIN_WIDTH);
    const observer = new ResizeObserver(([entry]) => setDocked(entry.contentRect.width >= DOCK_MIN_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Focus moves into the panel when it opens and back to the Edit button when it closes.
  useEffect(() => {
    const previous = previousSelected.current;
    previousSelected.current = selected;
    if (selected && docked) {
      panelRef.current?.focus();
    } else if (!selected && previous) {
      window.requestAnimationFrame(() => editButtons.current[previous]?.focus());
    }
  }, [selected, docked]);

  const mappingOf = (cardId: string) => configuration?.mappings.find((item) => item.cardId === cardId);
  const changesFor = (cardId: string | null) => (cardId ? changesOf(drafts[cardId], mappingOf(cardId)) : 0);

  const updateDraft = (cardId: string, change: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [cardId]: { ...current[cardId], ...change } }));

  const resetDraft = (cardId: string) =>
    setDrafts((current) => ({ ...current, [cardId]: draftFrom(mappingOf(cardId)) }));

  function select(next: string | null) {
    setSelected(next);
    setSaveError("");
  }

  function requestSelect(next: string | null) {
    if (selected && next !== selected && changesFor(selected) > 0) {
      setPending({ kind: "select", next });
      return;
    }
    select(next);
  }

  function requestRefresh() {
    if (changesFor(selected) > 0) {
      setPending({ kind: "refresh" });
      return;
    }
    void load();
  }

  function confirmDiscard() {
    if (!pending) return;
    if (pending.kind === "refresh") {
      setPending(null);
      setSaveError("");
      void load();
      return;
    }
    if (selected) resetDraft(selected);
    setPending(null);
    select(pending.next);
  }

  async function save(cardId: string) {
    const draft = drafts[cardId];
    setSaving(true);
    setSaveError("");
    try {
      if (draft.targets.length === 0) {
        await adminApi.deleteGptCodeMapping(cardId);
        toast.success(`${cardId} is now unassigned`);
      } else {
        await adminApi.saveGptCodeMapping(
          cardId,
          draft.targets.map(({ type, id }) => ({ type, id })),
          draft.isActive,
        );
        toast.success(`${cardId} mapping saved`);
      }
      await load();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Mapping could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const blockedCount = configuration?.exceptions.filter((exception) => exception.action === "block").length ?? 0;
  const selectedAccount = selected ? configuration?.accounts.find((account) => account.cardId === selected) : undefined;
  const hasPanel = Boolean(selectedAccount && configuration && drafts[selectedAccount.cardId]);
  const accountCount = configuration?.accounts.length ?? 0;

  const panel =
    selectedAccount && configuration && drafts[selectedAccount.cardId] ? (
      <EditPanel
        key={selectedAccount.cardId}
        account={selectedAccount}
        mapping={mappingOf(selectedAccount.cardId)}
        draft={drafts[selectedAccount.cardId]}
        configuration={configuration}
        saving={saving}
        saveError={saveError}
        onChange={(change) => updateDraft(selectedAccount.cardId, change)}
        onSave={() => void save(selectedAccount.cardId)}
        onDiscard={() => { resetDraft(selectedAccount.cardId); setSaveError(""); }}
        onClose={() => requestSelect(null)}
        onExceptionsChanged={() => load(true)}
      />
    ) : null;

  const onPanelKeyDown = (event: ReactKeyboardEvent) => {
    // The Dropdown handles its own Escape (and marks it) when its menu is open.
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      requestSelect(null);
    }
  };

  const editAction = (account: AdminGptCodeAccount) =>
    selected === account.cardId ? (
      <span className="text-[13px] font-semibold text-[var(--admin-brand)]">Editing</span>
    ) : (
      <Button ref={(element) => { editButtons.current[account.cardId] = element; }} onClick={() => requestSelect(account.cardId)} aria-label={`Edit ${account.cardId}`}>
        Edit
      </Button>
    );

  const rowProps = {
    accounts: configuration?.accounts ?? [],
    mappingOf,
    drafts,
    selected,
    unsavedOf: (cardId: string) => changesFor(cardId) > 0,
    action: editAction,
  };

  return (
    <AppShell>
      {/* Full-bleed so the editor docks flush to the right edge, below the top bar. */}
      <div ref={layoutRef} className="-mx-4 -my-6 flex min-h-[calc(100vh-3.75rem)] sm:-mx-6 lg:-mx-8">
        <div className="min-w-0 flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          <PageHeader
            title="GPT Code access"
            description="Choose which ChatGPT account each person gets. Select Edit on an account to change who it is offered to."
            actions={
              <>
                <Button variant="ghost" onClick={() => setRulesOpen(true)}>How rules work</Button>
                <Button onClick={requestRefresh} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin motion-reduce:animate-none")} />
                  Refresh
                </Button>
              </>
            }
          />

          <Card
            title="Accounts"
            description={configuration ? `${accountCount} ${accountCount === 1 ? "account" : "accounts"}` : undefined}
            actions={configuration ? <ConnectionStatus connected={configuration.centralAvailable} accountCount={accountCount} /> : undefined}
            busy={loading}
            footer={
              configuration && !error ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {blockedCount > 0 ? <span>{blockedCount} {blockedCount === 1 ? "person is" : "people are"} blocked from all accounts.</span> : null}
                  <button type="button" onClick={() => setManageOpen(true)} className="admin-focus rounded-sm font-semibold text-[var(--admin-brand)] hover:underline">
                    {blockedCount > 0 ? "Manage blocked" : "Manage exceptions"}
                  </button>
                </div>
              ) : undefined
            }
          >
            {error ? (
              <ErrorState title="Configuration could not load" message={error} onRetry={() => void load()} />
            ) : loading && !configuration ? (
              <LoadingState>Loading accounts...</LoadingState>
            ) : configuration && accountCount === 0 ? (
              <EmptyState title="No GPT accounts are available right now." />
            ) : configuration ? (
              <>
                <div className="md:hidden"><AccountsMobileList {...rowProps} /></div>
                <div className="hidden md:block"><AccountsTable {...rowProps} /></div>
              </>
            ) : null}
          </Card>
        </div>

        {/* Slides open only while an account is being edited, pushing the table
            over; closed it takes no room. */}
        {docked ? (
          <aside
            aria-hidden={!hasPanel}
            className={cn(
              "sticky top-[3.75rem] h-[calc(100vh-3.75rem)] shrink-0 overflow-hidden bg-[var(--admin-card)] transition-[width] duration-200 ease-out motion-reduce:transition-none",
              hasPanel && "border-l border-[var(--admin-border)]",
            )}
            style={{ width: hasPanel ? PANEL_WIDTH : 0 }}
          >
            {hasPanel ? (
              <div ref={panelRef} role="region" aria-label={`Edit ${selectedAccount?.cardId}`} tabIndex={-1} onKeyDown={onPanelKeyDown} className="h-full min-h-0 outline-none" style={{ width: PANEL_WIDTH }}>
                {panel}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      <Sheet open={!docked && hasPanel} onOpenChange={(open) => { if (!open) requestSelect(null); }} label={selectedAccount ? `Edit ${selectedAccount.cardId}` : "Edit account"}>
        {panel}
      </Sheet>

      <HowRulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />

      {configuration ? (
        <ExceptionsDialog open={manageOpen} onOpenChange={setManageOpen} configuration={configuration} onChanged={() => load(true)} />
      ) : null}

      <AdminConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        title="Discard unsaved changes?"
        description={`${selectedAccount?.cardId ?? "This account"} has ${changesFor(selected)} unsaved ${changesFor(selected) === 1 ? "change" : "changes"}.`}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={confirmDiscard}
      />
    </AppShell>
  );
}
