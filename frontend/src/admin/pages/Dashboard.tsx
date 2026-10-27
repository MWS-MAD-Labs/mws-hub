import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleAlert, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi, type AdminOverview } from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";
import { cn } from "@/lib/utils";

type Level = "ok" | "warning" | "problem";

const LEVEL: Record<Level, { label: string; className: string; icon: LucideIcon }> = {
  ok: { label: "Healthy", className: "border-[var(--admin-sage)]/30 bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)]", icon: CheckCircle2 },
  warning: { label: "Needs a look", className: "border-[var(--admin-gold)]/30 bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)]", icon: TriangleAlert },
  problem: { label: "Problem", className: "border-[var(--admin-rose)]/30 bg-[var(--admin-rose-soft)] text-[var(--admin-rose)]", icon: CircleAlert },
};

const FAILURE_LABEL: Record<string, string> = {
  entitlement_denied: "No access",
  maintenance: "Under maintenance",
  coming_soon: "Not released",
  no_link: "No link",
  unknown_app: "No longer available",
  central_unavailable: "Central did not answer",
  account_inactive: "Account inactive",
};

const dateTime = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

// Whether the Hub is working, what people opened through it, and what they reported.
export default function Dashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setOverview(await adminApi.overview());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load the overview.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <section className="admin-operations -mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9">
        <div className="mx-auto w-full max-w-[1360px]">
          <header className="flex flex-col gap-5 border-b border-[var(--admin-border-strong)] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="admin-heading text-xs font-bold text-[var(--admin-brand)]">Admin Overview</p>
              <h1 className="admin-heading mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--admin-text)] sm:text-4xl">Hub Overview</h1>
              <p className="mt-2 text-sm text-[var(--admin-text-secondary)]">Whether the Hub works, what people opened through it, and what they reported. Applications are managed in Central.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={isLoading} className="admin-heading inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[var(--admin-border-strong)] px-4 text-xs font-bold text-[var(--admin-text)]">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </button>
          </header>

          {isLoading && !overview ? (
            <div className="mt-7 h-96 animate-pulse rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)]" />
          ) : error ? (
            <div role="alert" className="mt-7 rounded-3xl border border-[var(--admin-rose)]/30 bg-[var(--admin-rose-soft)] p-6">
              <p className="admin-heading text-sm font-bold text-[var(--admin-rose)]">The overview could not load</p>
              <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{error}</p>
              <button type="button" onClick={() => void load()} className="admin-heading mt-3 text-xs font-bold text-[var(--admin-brand)] hover:underline">Try Again</button>
            </div>
          ) : overview ? (
            <div className="mt-7 space-y-7">
              <Health overview={overview} />
              <Activity overview={overview} />
              <Reports overview={overview} />
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function Card({ title, subtitle, aside, children }: { title: string; subtitle?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4 sm:px-7">
        <div>
          <h2 className="admin-heading text-sm font-bold text-[var(--admin-text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-[var(--admin-text-tertiary)]">{subtitle}</p> : null}
        </div>
        {aside}
      </div>
      <div className="px-5 py-4 sm:px-7">{children}</div>
    </section>
  );
}

function LevelPill({ level }: { level: Level }) {
  const { label, className, icon: Icon } = LEVEL[level];
  return (
    <span className={cn("admin-heading inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function Health({ overview }: { overview: AdminOverview }) {
  const { health } = overview;
  const down = health.apps.filter((app) => app.status === "down");
  return (
    <Card title="Health" subtitle={`Checked ${dateTime(overview.generated_at)}`} aside={<LevelPill level={health.status} />}>
      <ul className="divide-y divide-[var(--admin-border)]">
        {health.checks.map((check) => (
          <li key={check.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
            <span className="w-36 shrink-0 text-sm font-semibold text-[var(--admin-text)]">{check.label}</span>
            <LevelPill level={check.status} />
            <span className="min-w-0 flex-1 basis-64 text-sm text-[var(--admin-text-secondary)]">{check.detail}</span>
          </li>
        ))}
      </ul>
      {down.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-[var(--admin-gold-soft)] p-4">
          <p className="admin-heading text-xs font-bold text-[var(--admin-gold-text)]">Not answering</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--admin-text)]">
            {down.map((app) => (
              <li key={app.id}>
                <span className="font-semibold">{app.name}</span> <span className="font-mono text-xs text-[var(--admin-text-tertiary)]">{app.address}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function Tile({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] p-4">
      <p className="text-xs text-[var(--admin-text-tertiary)]">{label}</p>
      <p className={cn("admin-heading mt-1 text-3xl font-extrabold tracking-[-0.04em]", attention ? "text-[var(--admin-gold-text)]" : "text-[var(--admin-text)]")}>{value}</p>
    </div>
  );
}

function Activity({ overview }: { overview: AdminOverview }) {
  const { activity } = overview;
  const failures = Object.values(activity.failures30).reduce((sum, count) => sum + count, 0);
  return (
    <Card title="Launch Activity" subtitle="From the audit trail." aside={<Link to="/admin/audit-logs?range=this_month&action=application.launch" className="admin-heading inline-flex items-center gap-1 text-xs font-bold text-[var(--admin-brand)] hover:underline">All Launches<ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Launches, last 7 days" value={activity.launches7} />
        <Tile label="Launches, last 30 days" value={activity.launches30} />
        <Tile label="Refused or failed, last 30 days" value={failures} attention={failures > 0} />
      </div>
      {failures > 0 ? (
        <p className="mt-3 text-sm text-[var(--admin-text-secondary)]">
          {Object.entries(activity.failures30).map(([reason, count]) => `${FAILURE_LABEL[reason] ?? reason}: ${count}`).join(", ")}
        </p>
      ) : null}
      {activity.apps.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Launches per application</caption>
            <thead className="text-[10px] text-[var(--admin-text-tertiary)]">
              <tr>
                <th scope="col" className="py-2 pr-4">Application</th>
                <th scope="col" className="py-2 pr-4 text-right">7 days</th>
                <th scope="col" className="py-2 pr-4 text-right">30 days</th>
                <th scope="col" className="py-2 pr-4 text-right">Failed</th>
                <th scope="col" className="py-2">Last opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {activity.apps.map((app) => (
                <tr key={app.id}>
                  <td className="py-2.5 pr-4">
                    <Link to={`/admin/audit-logs?range=this_month&q=${encodeURIComponent(app.id)}`} className="font-semibold text-[var(--admin-text)] hover:underline">{app.name}</Link>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{app.launches7}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{app.launches30}</td>
                  <td className={cn("py-2.5 pr-4 text-right tabular-nums", app.failures30 > 0 && "font-semibold text-[var(--admin-gold-text)]")}>{app.failures30}</td>
                  <td className="py-2.5 text-xs text-[var(--admin-text-tertiary)]">{app.last_launch_at ? dateTime(app.last_launch_at) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--admin-text-secondary)]">Nobody opened an application through the Hub in the last 30 days.</p>
      )}
      {activity.never_opened.length > 0 ? (
        <p className="mt-4 text-xs text-[var(--admin-text-tertiary)]">
          Not opened in 30 days: {activity.never_opened.map((app) => app.name).join(", ")}
        </p>
      ) : null}
    </Card>
  );
}

function Reports({ overview }: { overview: AdminOverview }) {
  const { reports } = overview;
  return (
    <Card title="Reports" subtitle="Problems people reported from a card." aside={<Link to="/admin/broken-tools" className="admin-heading inline-flex items-center gap-1 text-xs font-bold text-[var(--admin-brand)] hover:underline">Review Queue<ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
      {reports.open === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-[var(--admin-sage)]" />
          <p className="admin-heading mt-3 text-sm font-bold text-[var(--admin-text)]">No reports need review</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--admin-text-secondary)]">
            <span className="admin-heading text-2xl font-extrabold text-[var(--admin-text)]">{reports.open}</span> open or in progress
          </p>
          <ul className="mt-3 divide-y divide-[var(--admin-border)]">
            {reports.by_app.map((row) => (
              <li key={row.application_id} className="flex items-center justify-between py-2.5 text-sm">
                <Link to={`/admin/broken-tools?q=${encodeURIComponent(row.name)}`} className="font-semibold text-[var(--admin-text)] hover:underline">{row.name}</Link>
                <span className="tabular-nums text-[var(--admin-text-secondary)]">{row.open}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
