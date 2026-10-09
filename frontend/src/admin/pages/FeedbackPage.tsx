import { useEffect, useState } from "react";
import { ArrowUpRight, KeyRound, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPageHeader from "@/admin/components/ui/AdminPageHeader";
import { REPORT_STATUS, ACCESS_STATUS } from "@/admin/components/ui/admin-status";
import { adminApi, type AdminAccessRequest, type AdminReport } from "@/admin/api/adminApi";
import { cn } from "@/lib/utils";

export default function FeedbackPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminApi.listReports(), adminApi.listAccessRequests()])
      .then(([nextReports, nextRequests]) => { if (!cancelled) { setReports(nextReports); setRequests(nextRequests); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load feedback overview."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const unresolvedReports = reports.filter((report) => report.status !== "RESOLVED");
  const pendingRequests = requests.filter((request) => request.status === "PENDING");

  return <AppShell><section className="-mx-4 -my-6 min-h-[calc(100vh-3.75rem)] bg-[var(--admin-bg)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9"><div className="mx-auto max-w-[1360px] space-y-7"><AdminPageHeader eyebrow="Queue overview" title="Feedback" description="A summary of broken-tool reports and application access requests." />
    {loading ? <div className="h-64 animate-pulse rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]" /> : error ? <div className="rounded-xl border border-[var(--admin-rose)]/30 bg-[var(--admin-card)] p-6 text-sm text-[var(--admin-rose)]">{error}</div> : <div className="grid gap-5 lg:grid-cols-2"><OverviewPanel title="Broken tools" count={unresolvedReports.length} icon={Wrench} href="/admin/broken-tools" action="Open broken tools">{unresolvedReports.slice(0, 5).map((report) => <OverviewRow key={report.id} title={report.application.name} detail={report.message} badge={REPORT_STATUS[report.status]} />)}</OverviewPanel><OverviewPanel title="Access requests" count={pendingRequests.length} icon={KeyRound} href="/admin/access-requests" action="Open access requests">{pendingRequests.slice(0, 5).map((request) => <OverviewRow key={request.id} title={request.application.name} detail={request.requester_email} badge={ACCESS_STATUS[request.status]} />)}</OverviewPanel></div>}
  </div></section></AppShell>;
}

function OverviewPanel({ title, count, icon: Icon, href, action, children }: { title: string; count: number; icon: typeof Wrench; href: string; action: string; children: React.ReactNode }) { return <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]"><div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"><Icon className="h-5 w-5" /></span><div className="flex-1"><h2 className="admin-heading text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">{count} need attention</p></div><Link to={href} className="admin-focus admin-heading inline-flex items-center gap-2 text-xs font-bold text-[var(--admin-brand)]">{action}<ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="divide-y divide-[var(--admin-border)]">{count ? children : <p className="p-5 text-sm text-[var(--admin-text-tertiary)]">Nothing needs review.</p>}</div></section>; }
function OverviewRow({ title, detail, badge }: { title: string; detail: string; badge: { label: string; className: string } }) { return <div className="flex items-start gap-3 p-5"><div className="min-w-0 flex-1"><p className="admin-heading text-sm font-bold">{title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--admin-text-secondary)]">{detail}</p></div><span className={cn("admin-heading shrink-0 rounded-md px-2 py-1 text-[10px] font-bold", badge.className)}>{badge.label}</span></div>; }
