import { useCallback, useEffect, useState } from "react";
import {
  AppWindow,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  adminApi,
  type AdminApplication,
  type AdminDashboardData,
  type AdminReport,
} from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const STATUS_STYLES: Record<AdminReport["status"], string> = {
  OPEN: "border-[var(--admin-gold)]/30 bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)]",
  IN_PROGRESS: "border-[var(--admin-navy)]/20 bg-[var(--admin-navy-soft)] text-[var(--admin-navy)]",
  RESOLVED: "border-[var(--admin-sage)]/30 bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)]",
};

function reportStatusLabel(status: AdminReport["status"]) {
  if (status === "IN_PROGRESS") return "In progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function Dashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dashboard, nextApplications, nextReports] = await Promise.all([
        adminApi.dashboard(),
        adminApi.listApplications(),
        adminApi.listReports(),
      ]);
      setData(dashboard);
      setApplications(nextApplications);
      setReports(nextReports);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openReports = reports.filter((report) => report.status !== "RESOLVED");
  const recentReports = reports.slice(0, 5);

  return (
    <AppShell>
      <section className="admin-operations -mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9">
        <div className="mx-auto w-full max-w-[1360px]">
          <header className="flex flex-col gap-5 border-b border-[var(--admin-border-strong)] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="admin-heading text-xs font-bold text-[var(--admin-brand)]">Admin Overview</p>
              <h1 className="admin-heading mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--admin-text)] sm:text-4xl">Operations Desk</h1>
              <p className="mt-2 text-sm text-[var(--admin-text-secondary)]">Review support queues and keep the MWS Hub catalogue current.</p>
            </div>
            <button type="button" onClick={() => void loadDashboard()} disabled={isLoading} className="admin-heading inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-4 text-xs font-bold text-[var(--admin-text)] transition-colors hover:bg-[var(--admin-card-subtle)] disabled:opacity-50">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </button>
          </header>

          {isLoading ? <DashboardSkeleton /> : error ? <DashboardError message={error} onRetry={loadDashboard} /> : data ? (
            <div className="mt-7 space-y-7">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
                <section className="overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]">
                  <div className="border-b border-[var(--admin-border)] px-5 py-5 sm:px-7">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="admin-heading text-xs font-bold text-[var(--admin-gold-text)]">Needs Attention</p>
                        <div className="mt-2 flex items-baseline gap-3">
                          <p className="admin-heading text-4xl font-extrabold tracking-[-0.04em] text-[var(--admin-text)]">{openReports.length}</p>
                          <p className="text-sm text-[var(--admin-text-secondary)]">open or in-progress {openReports.length === 1 ? "report" : "reports"}</p>
                        </div>
                      </div>
                      <Link to="/admin/broken-tools" className="admin-heading inline-flex items-center gap-2 rounded-full bg-[var(--admin-brand)] px-4 py-2.5 text-xs font-bold text-white dark:text-[#241718]">
                        Review Queue
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="px-5 sm:px-7">
                    <div className="flex items-center justify-between border-b border-[var(--admin-border)] py-4">
                      <div>
                        <h2 className="admin-heading text-sm font-bold text-[var(--admin-text)]">Recent Reports</h2>
                        <p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">Latest issues reported by Hub users.</p>
                      </div>
                      <Link to="/admin/broken-tools" className="admin-heading text-xs font-bold text-[var(--admin-brand)] hover:underline">View All</Link>
                    </div>

                    {recentReports.length ? (
                      <div>
                        {recentReports.map((report) => (
                          <article key={report.id} className="border-b border-[var(--admin-border)] py-5 last:border-0">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="admin-heading text-sm font-bold text-[var(--admin-text)]">{report.application.name}</p>
                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--admin-text-secondary)]">{report.message}</p>
                              </div>
                              <span className={cn("admin-heading w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold", STATUS_STYLES[report.status])}>{reportStatusLabel(report.status)}</span>
                            </div>
                            <div className="mt-3 flex flex-col gap-1 text-xs text-[var(--admin-text-tertiary)] sm:flex-row sm:flex-wrap sm:gap-x-3">
                              <span className="break-all">{report.reporter_email}</span>
                              <span>{formatDate(report.created_at)}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <CheckCircle2 className="mx-auto h-6 w-6 text-[var(--admin-sage)]" />
                        <p className="admin-heading mt-3 text-sm font-bold text-[var(--admin-text)]">No reports need review</p>
                        <p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">New broken-tool reports will appear here.</p>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)] sm:p-6">
                  <p className="admin-heading text-xs font-bold text-[var(--admin-text-tertiary)]">Hub Status</p>
                  <div className="mt-5 divide-y divide-[var(--admin-border)]">
                    <StatusRow icon={AppWindow} label="Applications" value={applications.length} />
                    <StatusRow icon={Eye} label="Central-Linked" value={applications.filter((application) => application.sso_central_entitlement_app_id).length} />
                    <StatusRow icon={EyeOff} label="Needs Central Link" value={applications.filter((application) => !application.sso_central_entitlement_app_id).length} />
                    <StatusRow icon={TriangleAlert} label="Open Reports" value={openReports.length} attention={openReports.length > 0} />
                  </div>
                  <div className="mt-6 border-t border-[var(--admin-border-strong)] pt-5">
                    <p className="admin-heading text-[10px] font-bold text-[var(--admin-text-tertiary)]">Administrative Context</p>
                    <p className="admin-heading mt-2 text-sm font-bold text-[var(--admin-text)]">{data.unit || "Not assigned"}</p>
                    {data.unitId ? <p className="mt-1 break-all font-mono text-[10px] text-[var(--admin-text-tertiary)]">{data.unitId}</p> : null}
                  </div>
                </aside>
              </div>

              <section>
                <div className="flex items-end justify-between border-b border-[var(--admin-border-strong)] pb-3">
                  <div>
                    <h2 className="admin-heading text-lg font-extrabold text-[var(--admin-text)]">Manage</h2>
                    <p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">Common administration workflows.</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3">
                  <ManageLink to="/admin/catalog" icon={AppWindow} title="Application Catalog" description="Add, edit, or maintain Hub applications." />
                  <ManageLink to="/admin/access-requests" icon={KeyRound} title="Access Requests" description="Review individual Central access decisions." />
                  <ManageLink to="/admin/audit-logs" icon={ClipboardList} title="Audit Logs" description="Review recent administrative changes." />
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function StatusRow({ icon: Icon, label, value, attention = false }: { icon: LucideIcon; label: string; value: number; attention?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
      <Icon className={cn("h-4 w-4", attention ? "text-[var(--admin-gold-text)]" : "text-[var(--admin-brand)]")} />
      <span className="flex-1 text-sm text-[var(--admin-text-secondary)]">{label}</span>
      <strong className="admin-heading text-sm font-extrabold text-[var(--admin-text)]">{value}</strong>
    </div>
  );
}

function ManageLink({ to, icon: Icon, title, description }: { to: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <Link to={to} className="group flex min-h-36 items-start gap-4 border-b border-[var(--admin-border)] py-5 transition-colors md:border-b-0 md:border-r md:px-5 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"><Icon className="h-4.5 w-4.5" /></span>
      <span className="min-w-0 flex-1">
        <span className="admin-heading flex items-center gap-2 text-sm font-bold text-[var(--admin-text)]">{title}<ArrowUpRight className="h-3.5 w-3.5 text-[var(--admin-text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--admin-brand)]" /></span>
        <span className="mt-2 block text-xs leading-5 text-[var(--admin-text-secondary)]">{description}</span>
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-7 grid animate-pulse gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
      <div className="h-[520px] rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)]" />
      <div className="h-[360px] rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)]" />
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <div className="mt-7 rounded-3xl border border-[var(--admin-rose)]/30 bg-[var(--admin-card)] p-6 shadow-[var(--admin-shadow)]">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--admin-rose-soft)] text-[var(--admin-rose)]"><Wrench className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="admin-heading text-sm font-bold text-[var(--admin-text)]">Dashboard Could Not Be Loaded</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{message}</p>
          <button type="button" onClick={() => void onRetry()} className="admin-heading mt-4 rounded-full bg-[var(--admin-brand)] px-4 py-2 text-xs font-bold text-white dark:text-[#241718]">Try Again</button>
        </div>
      </div>
    </div>
  );
}
