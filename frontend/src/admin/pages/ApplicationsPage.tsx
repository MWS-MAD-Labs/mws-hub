import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPageHeader from "@/admin/components/ui/AdminPageHeader";
import AdminPagination from "@/admin/components/ui/AdminPagination";
import AdminConfirmDialog from "@/admin/components/ui/AdminConfirmDialog";
import { getAppIcon } from "@/data/hubCategories";
import { adminApi, type AdminApplication } from "@/admin/api/adminApi";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<AdminApplication["status"], string> = {
  ACTIVE: "bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)]",
  MAINTENANCE: "bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)]",
  COMING_SOON: "bg-[var(--admin-navy-soft)] text-[var(--admin-navy)]",
  NEW: "bg-[color-mix(in_srgb,var(--admin-sky)_35%,transparent)] text-[var(--admin-sky-text)]",
};

const statusLabel = (status: AdminApplication["status"]) => status.replace("_", " ").toLowerCase();

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminApplication | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [params, setParams] = useSearchParams();
  const searchQuery = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;

  async function loadApplications() {
    setIsLoading(true); setError("");
    try { setApplications(await adminApi.listApplications()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load applications."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { void loadApplications(); }, []);

  const updateParams = (patch: Record<string, string>) => setParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    return next;
  }, { replace: true });

  async function removeApplication(application: AdminApplication) {
    setIsDeleting(true);
    try { await adminApi.deleteApplication(application.id); toast.success("Application deleted"); setDeleteTarget(null); await loadApplications(); }
    catch (removeError) { toast.error(removeError instanceof Error ? removeError.message : "Failed to delete application."); }
    finally { setIsDeleting(false); }
  }

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter((application) => [application.name, application.id, application.description, application.audience, application.category, application.status, application.discoverable ? "visible" : "hidden", ...application.keywords].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [applications, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageApplications = filteredApplications.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
    <AppShell>
      <section className="-mx-4 -my-6 min-h-[calc(100vh-3.75rem)] bg-[var(--admin-bg)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1360px]">
          <AdminPageHeader eyebrow="Catalog Management" title="Application Catalog" description="Manage applications shown in MWS Hub." actions={<Link to="/admin/catalog/new" className="admin-focus admin-heading inline-flex h-10 items-center gap-2 rounded-full bg-[var(--admin-brand)] px-4 text-xs font-bold text-white dark:text-[#241718]"><Plus className="h-4 w-4" />Add Application</Link>} />
          <div className="mt-7 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]" aria-busy={isLoading}>
            <div className="flex flex-col gap-4 border-b border-[var(--admin-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="admin-heading text-sm font-bold">All Applications</h2><p className="mt-1 text-xs text-[var(--admin-text-tertiary)]" aria-live="polite">{filteredApplications.length} applications</p></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative"><span className="sr-only">Search applications</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-tertiary)]" /><input type="search" placeholder="Search applications" value={searchQuery} onChange={(event) => updateParams({ q: event.target.value, page: "1" })} className="admin-focus h-10 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] pl-9 pr-3 text-sm sm:w-72" /></label>
                <button type="button" onClick={() => void loadApplications()} disabled={isLoading} className="admin-focus admin-heading inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--admin-border-strong)] px-3 text-xs font-bold"><RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />{isLoading ? "Refreshing" : "Refresh"}</button>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-sm"><caption className="sr-only">MWS Hub application catalog</caption>
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)] text-[10px] text-[var(--admin-text-tertiary)]"><tr><th scope="col" className="px-5 py-3">Application</th><th scope="col" className="px-5 py-3">Category</th><th scope="col" className="px-5 py-3">Status</th><th scope="col" className="px-5 py-3">Central Application</th><th scope="col" className="px-5 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-[var(--admin-border)]">{isLoading || error || !pageApplications.length ? <StateRow loading={isLoading} error={error} empty={searchQuery ? "No applications match your search." : "No applications found."} retry={loadApplications} /> : pageApplications.map((application) => <ApplicationRow key={application.id} application={application} onDelete={removeApplication} />)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--admin-border)] md:hidden">{isLoading ? <p className="p-5 text-sm text-[var(--admin-text-tertiary)]">Loading applications...</p> : error ? <button onClick={() => void loadApplications()} className="p-5 text-sm text-[var(--admin-brand)]">{error} Try Again</button> : pageApplications.map((application) => <MobileApplicationRow key={application.id} application={application} onDelete={removeApplication} />)}</div>
            {!isLoading && !error ? <AdminPagination page={safePage} pageSize={pageSize} total={filteredApplications.length} onPageChange={(next) => updateParams({ page: String(next) })} onPageSizeChange={(next) => updateParams({ pageSize: String(next), page: "1" })} /> : null}
          </div>
        </div>
      </section>
    </AppShell>
    <AdminConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title={`Delete “${deleteTarget?.name || "application"}”?`} description="This removes the application from the Hub catalog and prevents Hub launches. Existing reports and access requests remain for audit history. There is no restore action in the admin portal." confirmLabel="Delete Application" cancelLabel="Keep Application" destructive pending={isDeleting} onConfirm={() => { if (deleteTarget) void removeApplication(deleteTarget); }} />
    </>
  );
}

function ApplicationIdentity({ application }: { application: AdminApplication }) { const Icon = getAppIcon(application.icon || "AppWindow"); return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="admin-heading truncate text-sm font-bold">{application.name}</p><p className="mt-0.5 truncate font-mono text-[10px] text-[var(--admin-text-tertiary)]">{application.id}</p></div></div>; }
function ApplicationActions({ application, onDelete }: { application: AdminApplication; onDelete: (app: AdminApplication) => void }) { return <div className="flex justify-end gap-1"><Link to={`/admin/catalog/${encodeURIComponent(application.id)}/edit`} aria-label={`Edit ${application.name}`} className="admin-focus grid h-8 w-8 place-items-center rounded-lg hover:bg-[var(--admin-card-subtle)]"><Pencil className="h-4 w-4" /></Link><button type="button" onClick={() => onDelete(application)} aria-label={`Delete ${application.name}`} className="admin-focus grid h-8 w-8 place-items-center rounded-lg text-[var(--admin-rose)] hover:bg-[var(--admin-rose-soft)]"><Trash2 className="h-4 w-4" /></button></div>; }
function ApplicationRow({ application, onDelete }: { application: AdminApplication; onDelete: (app: AdminApplication) => void }) { return <tr className="hover:bg-[var(--admin-card-subtle)]"><td className="px-5 py-4"><ApplicationIdentity application={application} /></td><td className="px-5 py-4 text-xs capitalize text-[var(--admin-text-secondary)]">{application.category}</td><td className="px-5 py-4"><span className={cn("admin-heading rounded-md px-2 py-1 text-[10px] font-bold capitalize", STATUS_STYLE[application.status])}>{statusLabel(application.status)}</span></td><td className="px-5 py-4 font-mono text-xs text-[var(--admin-text-secondary)]">{application.sso_central_entitlement_app_id || "Not linked"}</td><td className="px-5 py-4"><ApplicationActions application={application} onDelete={onDelete} /></td></tr>; }
function MobileApplicationRow(props: { application: AdminApplication; onDelete: (app: AdminApplication) => void }) { const { application } = props; return <article className="p-4"><div className="flex items-start justify-between gap-3"><ApplicationIdentity application={application} /><ApplicationActions {...props} /></div><div className="mt-3 flex flex-wrap gap-2 text-[10px]"><span className="capitalize text-[var(--admin-text-secondary)]">{application.category}</span><span className={cn("rounded-md px-2 py-1 capitalize", STATUS_STYLE[application.status])}>{statusLabel(application.status)}</span><span className="font-mono">{application.sso_central_entitlement_app_id || "Not linked"}</span></div></article>; }
function StateRow({ loading, error, empty, retry }: { loading: boolean; error: string; empty: string; retry: () => Promise<void> }) { return <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[var(--admin-text-tertiary)]">{loading ? "Loading applications..." : error ? <><p className="text-[var(--admin-rose)]">{error}</p><button onClick={() => void retry()} className="mt-3 font-bold text-[var(--admin-brand)]">Try Again</button></> : empty}</td></tr>; }
