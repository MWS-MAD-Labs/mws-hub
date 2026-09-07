import { useEffect, useState } from "react";
import {
  AppWindow,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  adminApi,
  type AdminApplication,
  type AdminDashboardData,
  type AdminReport,
} from "@/admin/api/adminApi";
import AppShell from "@/admin/components/layout/AppShell";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function reportStatusClass(status: AdminReport["status"]) {
  if (status === "RESOLVED") return "bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function reportStatusLabel(status: AdminReport["status"]) {
  return status.replace("_", " ").toLowerCase();
}

export default function Dashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState("");
  const isLoading = !data && !error;
  const publishedApplications = applications.filter(
    (application) => application.discoverable,
  );
  const hiddenApplications = applications.filter(
    (application) => !application.discoverable,
  );
  const openReports = reports.filter((report) => report.status !== "RESOLVED");
  const recentReports = [...reports]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )
    .slice(0, 5);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [dashboard, nextApplications, nextReports] = await Promise.all([
          adminApi.dashboard(),
          adminApi.listApplications(),
          adminApi.listReports(),
        ]);
        if (!cancelled) {
          setData(dashboard);
          setApplications(nextApplications);
          setReports(nextReports);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load admin dashboard.",
          );
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <section className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="w-full p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Admin overview
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Overview of your MWS Hub administration
              </p>
            </div>
            <nav className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-medium text-slate-900">Dashboard</span>
            </nav>
          </div>

          {isLoading ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <div className="h-4 w-24 rounded bg-slate-100" />
                    <div className="mt-4 h-7 w-16 rounded bg-slate-100" />
                    <div className="mt-3 h-3 w-28 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div
                  className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5"
                />
                <div
                  className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white p-5"
                />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-destructive">
                Failed to load dashboard
              </p>
              <p className="mt-1 text-sm text-slate-500">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={AppWindow}
                  label="Total Applications"
                  value={applications.length}
                  helper="Applications in catalog"
                />
                <MetricCard
                  icon={Eye}
                  label="Published Applications"
                  value={publishedApplications.length}
                  helper="Visible in Hub"
                />
                <MetricCard
                  icon={EyeOff}
                  label="Hidden Applications"
                  value={hiddenApplications.length}
                  helper="Hidden from Hub"
                />
                <MetricCard
                  icon={TriangleAlert}
                  label="Open Reports"
                  value={openReports.length}
                  helper="Open or in progress"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Welcome
                  </p>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
                    {data.message}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Use this command center to manage catalog entries and review
                    support queues for MWS Hub.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-primary ring-1 ring-slate-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Context
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {data.unit || "Not assigned"}
                      </p>
                      {data.unitId ? (
                        <p className="mt-2 break-all font-mono text-xs text-slate-500">
                          {data.unitId}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Quick Actions
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Common admin workflows for managing MWS Hub.
                    </p>
                  </div>
                  <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-1">
                    <Link
                      to="/admin/catalog"
                      className="group flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-primary/30 hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-primary ring-1 ring-slate-200">
                          <AppWindow className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            Manage Applications
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-500">
                            Add, edit, hide, or maintain applications displayed in
                            the Hub catalog.
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>

                    <Link
                      to="/admin/broken-tools"
                      className="group flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-primary/30 hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-primary ring-1 ring-slate-200">
                          <Wrench className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            Review Broken Tools
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-500">
                            Triage user reports when an application link or tool
                            is not working.
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recent Reports
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Latest broken-tool reports.
                      </p>
                    </div>
                    <Link
                      to="/admin/broken-tools"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {recentReports.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {recentReports.map((report) => (
                        <div key={report.id} className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {report.application.name}
                              </p>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                                {report.message}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium capitalize ${reportStatusClass(report.status)}`}
                            >
                              {reportStatusLabel(report.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>{report.reporter_email}</span>
                            <span>{formatDate(report.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-5 text-sm text-slate-500">
                      No broken-tool reports available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof AppWindow;
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-primary ring-1 ring-slate-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
