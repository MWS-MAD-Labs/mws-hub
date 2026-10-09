import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPageHeader from "@/admin/components/ui/AdminPageHeader";
import AdminPagination from "@/admin/components/ui/AdminPagination";
import Dropdown from "@/admin/components/ui/Dropdown";
import AdminFieldLabel from "@/admin/components/ui/AdminFieldLabel";
import { adminApi, type AdminAuditLog, type AdminPaginationMeta } from "@/admin/api/adminApi";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = { "application.create": "Create app", "application.update": "Update app", "application.delete": "Delete app", "app_report.update_status": "Update report", "access_request.update_status": "Update access", "application.launch": "Launch app", "auth.login": "Sign in", "auth.logout": "Sign out", "hub.login_denied": "Login denied" };
const formatDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
type RangePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";
const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shiftDate = (value: string, days: number) => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return toDateOnly(date); };
function rangeFor(preset: RangePreset) { const now = new Date(); const today = toDateOnly(now); if (preset === "today") return { from: today, to: today }; if (preset === "this_month") return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }; if (preset === "last_month") return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 0)) }; const day = now.getDay(); const mondayOffset = day === 0 ? -6 : 1 - day; return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)), to: today }; }

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [pagination, setPagination] = useState<AdminPaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1, hasPreviousPage: false, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = [10, 25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 10;
  const query = params.get("q") || "";
  const preset = (params.get("range") || "this_week") as RangePreset;
  const presetRange = rangeFor(preset === "custom" ? "this_week" : preset);
  const dateFrom = params.get("dateFrom") || presetRange.from;
  const dateTo = params.get("dateTo") || presetRange.to;

  const load = useCallback(async () => { setLoading(true); try { const result = await adminApi.listAuditLogs({ page, pageSize, q: query, dateFrom, dateTo }); setLogs(result.data); setPagination(result.pagination); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to load audit logs."); } finally { setLoading(false); } }, [page, pageSize, query, dateFrom, dateTo]);
  useEffect(() => { void load(); }, [load]);
  const updateParams = (patch: Record<string, string>) => setParams((current) => { const next = new URLSearchParams(current); Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); return next; }, { replace: true });

  return <AppShell><section className="-mx-4 -my-6 min-h-[calc(100vh-3.75rem)] bg-[var(--admin-bg)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9"><div className="mx-auto max-w-[1360px]">
    <AdminPageHeader eyebrow="Admin Trail" title="Audit Logs" description="Review administrative actions and Hub security events." actions={<button type="button" onClick={() => void load()} disabled={loading} className="admin-focus admin-heading inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-4 text-xs font-bold"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />{loading ? "Refreshing" : "Refresh"}</button>} />
    <div className="mt-7 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]" aria-busy={loading}>
      <div className="border-b border-[var(--admin-border)] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="admin-heading text-sm font-bold">Recorded Events</h2>
            <p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">{pagination.total} events</p>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
            <label className="flex flex-col sm:col-span-2 xl:w-80">
              <AdminFieldLabel>Search</AdminFieldLabel>
              <span className="relative mt-1.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-tertiary)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => updateParams({ q: event.target.value, page: "1" })}
                  placeholder="Search actor, action, or entity"
                  className="admin-focus h-10 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] pl-9 pr-3 text-sm"
                />
              </span>
            </label>
            <div className="flex flex-col">
              <AdminFieldLabel>Date Range</AdminFieldLabel>
              <Dropdown
                value={preset}
                onChange={(value) => {
                  const next = rangeFor(value === "custom" ? "this_week" : value);
                  updateParams({ range: value, dateFrom: next.from, dateTo: next.to, page: "1" });
                }}
                options={[
                  { value: "today", label: "Today" },
                  { value: "this_week", label: "This Week" },
                  { value: "this_month", label: "This Month" },
                  { value: "last_month", label: "Last Month" },
                  { value: "custom", label: "Custom Range" },
                ]}
                ariaLabel="Date Range"
                buttonClassName="mt-1.5"
                className="w-full sm:w-44"
              />
            </div>
            {preset === "custom" ? (
              <>
                <DateInput label="From" value={dateFrom} min={shiftDate(dateTo, -30)} max={dateTo} onChange={(value) => updateParams({ dateFrom: value, page: "1" })} />
                <DateInput label="To" value={dateTo} min={dateFrom} max={minDate(shiftDate(dateFrom, 30), toDateOnly(new Date()))} onChange={(value) => updateParams({ dateTo: value, page: "1" })} />
              </>
            ) : null}
          </div>
        </div>
      </div>
      {loading ? <p className="p-6 text-sm text-[var(--admin-text-tertiary)]">Loading audit logs...</p> : logs.length === 0 ? <p className="p-6 text-sm text-[var(--admin-text-tertiary)]">No audit logs found.</p> : <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">MWS Hub audit logs</caption><thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)] text-[10px] text-[var(--admin-text-tertiary)]"><tr><th scope="col" className="px-4 py-3">Time</th><th scope="col" className="px-4 py-3">Actor</th><th scope="col" className="px-4 py-3">Action</th><th scope="col" className="px-4 py-3">Target</th><th scope="col" className="px-4 py-3">Summary</th><th scope="col" className="px-4 py-3">Details</th></tr></thead><tbody className="divide-y divide-[var(--admin-border)]">{logs.map((log) => <AuditRow key={log.id} log={log} />)}</tbody></table></div><div className="divide-y divide-[var(--admin-border)] md:hidden">{logs.map((log) => <MobileAuditRow key={log.id} log={log} />)}</div></>}
      {!loading ? <AdminPagination page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} onPageChange={(next) => updateParams({ page: String(next) })} onPageSizeChange={(next) => updateParams({ pageSize: String(next), page: "1" })} /> : null}
    </div></div></section></AppShell>;
}

function Metadata({ log }: { log: AdminAuditLog }) { return log.metadata ? <details><summary className="admin-focus cursor-pointer text-xs font-bold text-[var(--admin-brand)]">View Metadata</summary><pre className="mt-2 max-h-64 max-w-lg overflow-auto rounded-lg bg-[var(--admin-bg)] p-3 text-xs text-[var(--admin-text-secondary)]">{JSON.stringify(log.metadata, null, 2)}</pre></details> : <span className="text-xs text-[var(--admin-text-tertiary)]">None</span>; }
function minDate(left: string, right: string) { return left < right ? left : right; }
function DateInput({ label, value, min, max, onChange }: { label: string; value: string; min: string; max: string; onChange: (value: string) => void }) { return <label className="flex flex-col"><AdminFieldLabel>{label}</AdminFieldLabel><input type="date" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="admin-focus mt-1.5 h-10 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-3 text-sm sm:w-40" /></label>; }
function AuditRow({ log }: { log: AdminAuditLog }) { return <tr className="align-top hover:bg-[var(--admin-card-subtle)]"><td className="whitespace-nowrap px-4 py-4 text-xs text-[var(--admin-text-tertiary)]">{formatDate(log.created_at)}</td><td className="px-4 py-4"><p className="admin-heading text-xs font-bold">{log.actor_name || log.actor_email}</p><p className="mt-1 text-[10px] text-[var(--admin-text-tertiary)]">{log.actor_email}</p></td><td className="px-4 py-4"><span className="rounded-md bg-[var(--admin-brand-soft)] px-2 py-1 text-[10px] font-bold text-[var(--admin-brand)]">{ACTION_LABELS[log.action] || log.action}</span></td><td className="px-4 py-4"><p className="text-xs font-semibold">{log.entity_type}</p><p className="mt-1 max-w-40 truncate font-mono text-[10px] text-[var(--admin-text-tertiary)]">{log.entity_id}</p></td><td className="max-w-md px-4 py-4 text-xs leading-5 text-[var(--admin-text-secondary)]">{log.summary}</td><td className="px-4 py-4"><Metadata log={log} /></td></tr>; }
function MobileAuditRow({ log }: { log: AdminAuditLog }) { return <article className="p-4"><div className="flex items-start justify-between gap-3"><div><span className="rounded-md bg-[var(--admin-brand-soft)] px-2 py-1 text-[10px] font-bold text-[var(--admin-brand)]">{ACTION_LABELS[log.action] || log.action}</span><p className="admin-heading mt-3 text-sm font-bold">{log.summary}</p></div><time className="shrink-0 text-[10px] text-[var(--admin-text-tertiary)]">{formatDate(log.created_at)}</time></div><p className="mt-2 text-xs text-[var(--admin-text-secondary)]">{log.actor_name || log.actor_email} · {log.entity_type}</p><div className="mt-3"><Metadata log={log} /></div></article>; }
