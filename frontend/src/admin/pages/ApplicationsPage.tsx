import { useEffect, useMemo, useState } from "react";
import { Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPageHeader from "@/admin/components/ui/AdminPageHeader";
import AdminPagination from "@/admin/components/ui/AdminPagination";
import AdminConfirmDialog from "@/admin/components/ui/AdminConfirmDialog";
import Dropdown from "@/admin/components/ui/Dropdown";
import { getAppIcon } from "@/data/hubCategories";
import { adminApi, type AdminDisplayInput, type AdminDisplayItem } from "@/admin/api/adminApi";
import { cn } from "@/lib/utils";

type Status = AdminDisplayItem["status"];

const STATUS_STYLE: Record<Status, string> = {
  active: "bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)]",
  maintenance: "bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)]",
  coming_soon: "bg-[var(--admin-navy-soft)] text-[var(--admin-navy)]",
  new: "bg-[color-mix(in_srgb,var(--admin-sky)_35%,transparent)] text-[var(--admin-sky-text)]",
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "coming_soon", label: "Coming Soon" },
  { value: "new", label: "New" },
];

const statusLabel = (status: Status) => STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

export default function ApplicationsPage() {
  const [items, setItems] = useState<AdminDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminDisplayItem | null>(null);
  const [draft, setDraft] = useState<AdminDisplayInput | null>(null);
  const [keywordText, setKeywordText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDisplayItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [params, setParams] = useSearchParams();
  const searchQuery = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      setItems(await adminApi.listDisplay());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const updateParams = (patch: Record<string, string>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true },
    );

  function startEdit(item: AdminDisplayItem) {
    setEditing(item);
    setDraft({ status: item.status, discoverable: item.discoverable, keywords: item.keywords });
    setKeywordText(item.keywords.join(", "));
  }

  async function save() {
    if (!editing || !draft) return;
    setIsSaving(true);
    try {
      const keywords = keywordText.split(",").map((word) => word.trim()).filter(Boolean);
      await adminApi.updateDisplay(editing.id, { ...draft, keywords });
      toast.success("Display saved");
      setEditing(null);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(item: AdminDisplayItem) {
    setIsDeleting(true);
    try {
      await adminApi.deleteApplication(item.id);
      toast.success("Application deleted");
      setDeleteTarget(null);
      await load();
    } catch (removeError) {
      toast.error(removeError instanceof Error ? removeError.message : "Failed to delete application.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => [item.name, item.id, item.category, item.status, ...item.keywords].join(" ").toLowerCase().includes(query));
  }, [items, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <AppShell>
        <section className="-mx-4 -my-6 min-h-[calc(100vh-3.75rem)] bg-[var(--admin-bg)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1360px]">
            <AdminPageHeader
              eyebrow="Catalog Management"
              title="App Display"
              description="How each card looks in the Hub. The name, address and who may open an application are changed in Central."
            />
            <div className="mt-7 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]" aria-busy={isLoading}>
              <div className="flex flex-col gap-4 border-b border-[var(--admin-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="admin-heading text-sm font-bold">All Applications</h2>
                  <p className="mt-1 text-xs text-[var(--admin-text-tertiary)]" aria-live="polite">{filtered.length} applications</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative">
                    <span className="sr-only">Search applications</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-tertiary)]" />
                    <input type="search" placeholder="Search applications" value={searchQuery} onChange={(event) => updateParams({ q: event.target.value, page: "1" })} className="admin-focus h-10 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] pl-9 pr-3 text-sm sm:w-72" />
                  </label>
                  <button type="button" onClick={() => void load()} disabled={isLoading} className="admin-focus admin-heading inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--admin-border-strong)] px-3 text-xs font-bold">
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    {isLoading ? "Refreshing" : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <caption className="sr-only">How each application is shown in the Hub</caption>
                  <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)] text-[10px] text-[var(--admin-text-tertiary)]">
                    <tr>
                      <th scope="col" className="px-5 py-3">Application</th>
                      <th scope="col" className="px-5 py-3">Category</th>
                      <th scope="col" className="px-5 py-3">Status</th>
                      <th scope="col" className="px-5 py-3">Found In Search</th>
                      <th scope="col" className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {isLoading || error || !pageItems.length ? (
                      <StateRow loading={isLoading} error={error} empty={searchQuery ? "No applications match your search." : "No applications found."} retry={load} />
                    ) : (
                      pageItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[var(--admin-card-subtle)]">
                          <td className="px-5 py-4"><Identity item={item} /></td>
                          <td className="px-5 py-4 text-xs capitalize text-[var(--admin-text-secondary)]">{item.category}</td>
                          <td className="px-5 py-4"><StatusPill status={item.status} /></td>
                          <td className="px-5 py-4 text-xs text-[var(--admin-text-secondary)]">{item.discoverable ? "Yes" : "Hidden"}</td>
                          <td className="px-5 py-4"><Actions item={item} onEdit={startEdit} onDelete={setDeleteTarget} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[var(--admin-border)] md:hidden">
                {isLoading ? (
                  <p className="p-5 text-sm text-[var(--admin-text-tertiary)]">Loading applications...</p>
                ) : error ? (
                  <button onClick={() => void load()} className="p-5 text-sm text-[var(--admin-brand)]">{error} Try Again</button>
                ) : (
                  pageItems.map((item) => (
                    <article key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Identity item={item} />
                        <Actions item={item} onEdit={startEdit} onDelete={setDeleteTarget} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                        <span className="capitalize text-[var(--admin-text-secondary)]">{item.category}</span>
                        <StatusPill status={item.status} />
                        {item.discoverable ? null : <span className="text-[var(--admin-text-secondary)]">Hidden</span>}
                      </div>
                    </article>
                  ))
                )}
              </div>
              {!isLoading && !error ? (
                <AdminPagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={(next) => updateParams({ page: String(next) })} onPageSizeChange={(next) => updateParams({ pageSize: String(next), page: "1" })} />
              ) : null}
            </div>
          </div>
        </section>
      </AppShell>

      <AdminConfirmDialog
        open={Boolean(editing)}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        title={`Display of ${editing?.name ?? "application"}`}
        description="This only changes how the card is shown. Who may open the application stays as it is in Central."
        confirmLabel="Save"
        pending={isSaving}
        onConfirm={() => void save()}
      >
        {draft ? (
          <div className="space-y-4">
            <div>
              <p className="admin-heading mb-1.5 text-xs font-bold">Status</p>
              <Dropdown<Status> value={draft.status} options={STATUS_OPTIONS} onChange={(status) => setDraft({ ...draft, status })} ariaLabel="Status" />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={draft.discoverable} onChange={(event) => setDraft({ ...draft, discoverable: event.target.checked })} />
              <span>
                <span className="admin-heading font-bold">Show in search</span>
                <span className="block text-xs text-[var(--admin-text-tertiary)]">Turn this off to take the card off the Hub for everyone.</span>
              </span>
            </label>
            <label className="block">
              <span className="admin-heading mb-1.5 block text-xs font-bold">Keywords</span>
              <input value={keywordText} onChange={(event) => setKeywordText(event.target.value)} placeholder="attendance, check in" className="admin-focus h-10 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-3 text-sm" />
              <span className="mt-1 block text-xs text-[var(--admin-text-tertiary)]">Separate with commas. They help people find the card.</span>
            </label>
          </div>
        ) : null}
      </AdminConfirmDialog>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete “${deleteTarget?.name || "application"}”?`}
        description="This removes an older Hub entry that Central does not publish. Existing reports and access requests remain for audit history."
        confirmLabel="Delete Application"
        cancelLabel="Keep Application"
        destructive
        pending={isDeleting}
        onConfirm={() => { if (deleteTarget) void remove(deleteTarget); }}
      />
    </>
  );
}

function Identity({ item }: { item: AdminDisplayItem }) {
  const Icon = getAppIcon(item.icon || "AppWindow");
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="admin-heading truncate text-sm font-bold">{item.name}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--admin-text-tertiary)]">
          {item.id}{item.in_central ? "" : " · Not in Central"}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  return <span className={cn("admin-heading rounded-md px-2 py-1 text-[10px] font-bold", STATUS_STYLE[status])}>{statusLabel(status)}</span>;
}

// A card Central publishes is edited. An older entry Central does not cover can only be removed.
function Actions({ item, onEdit, onDelete }: { item: AdminDisplayItem; onEdit: (item: AdminDisplayItem) => void; onDelete: (item: AdminDisplayItem) => void }) {
  return (
    <div className="flex justify-end gap-1">
      {item.in_central ? (
        <button type="button" onClick={() => onEdit(item)} aria-label={`Edit display of ${item.name}`} className="admin-focus grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--admin-card-subtle)]"><Pencil className="h-4 w-4" /></button>
      ) : (
        <button type="button" onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`} className="admin-focus grid h-8 w-8 place-items-center rounded-lg text-[var(--admin-rose)] hover:bg-[var(--admin-rose-soft)]"><Trash2 className="h-4 w-4" /></button>
      )}
    </div>
  );
}

function StateRow({ loading, error, empty, retry }: { loading: boolean; error: string; empty: string; retry: () => Promise<void> }) {
  return (
    <tr>
      <td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--admin-text-tertiary)]">
        {loading ? "Loading applications..." : error ? (<><p className="text-[var(--admin-rose)]">{error}</p><button onClick={() => void retry()} className="mt-3 font-bold text-[var(--admin-brand)]">Try Again</button></>) : empty}
      </td>
    </tr>
  );
}
