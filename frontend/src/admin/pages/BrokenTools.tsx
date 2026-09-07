import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import Dropdown from "@/admin/components/ui/Dropdown";
import { adminApi, type AdminReport } from "@/admin/api/adminApi";

type StatusFilter = AdminReport["status"] | "ALL";

const statusOptions: AdminReport["status"][] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
];

function statusLabel(status: AdminReport["status"]) {
  return status.replace("_", " ").toLowerCase();
}

function statusClass(status: AdminReport["status"]) {
  if (status === "RESOLVED") return "bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function statusIcon(status: AdminReport["status"]) {
  if (status === "RESOLVED") return CheckCircle2;
  if (status === "IN_PROGRESS") return Clock3;
  return TriangleAlert;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BrokenTools() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [updatingId, setUpdatingId] = useState("");

  async function loadReports() {
    setIsLoading(true);
    setError("");
    try {
      setReports(await adminApi.listReports());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load broken-tool reports.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function changeReport(id: string, status: AdminReport["status"]) {
    setUpdatingId(id);
    try {
      await adminApi.updateReport(id, status);
      await loadReports();
      toast.success("Report updated");
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update report.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const byStatus =
      statusFilter === "ALL"
        ? reports
        : reports.filter((report) => report.status === statusFilter);

    if (!query) return byStatus;

    return byStatus.filter((report) =>
      [
        report.application.name,
        report.application.id,
        report.reporter_email,
        report.message,
        report.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [reports, searchQuery, statusFilter]);

  return (
    <AppShell>
      <section className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="w-full p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Review queue
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Broken Tools
              </h1>
            </div>
            <nav className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/admin" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-900">Broken Tools</span>
            </nav>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  All reports
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredReports.length} reports
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search reports..."
                    className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-64"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>

                <Dropdown
                  value={statusFilter}
                  className="sm:w-40"
                  placeholder="All status"
                  options={[
                    { value: "ALL", label: "All status" },
                    ...statusOptions.map((status) => ({
                      value: status,
                      label: statusLabel(status),
                    })),
                  ]}
                  onChange={setStatusFilter}
                />

                <button
                  type="button"
                  onClick={() => void loadReports()}
                  disabled={isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Ticket
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Reporter
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Issue
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Reported
                    </th>
                    <th className="w-44 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      Manage
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                        Loading broken-tool reports...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <p className="text-sm text-destructive">{error}</p>
                        <button
                          type="button"
                          onClick={() => void loadReports()}
                          className="mt-3 text-sm font-medium text-primary"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                        {searchQuery.trim()
                          ? "No broken-tool reports match your search."
                          : statusFilter !== "ALL"
                            ? `No ${statusLabel(statusFilter)} reports found.`
                            : "No broken-tool reports found."}
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => {
                      const StatusIcon = statusIcon(report.status);

                      return (
                        <tr
                          key={report.id}
                          className="group transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                                <Wrench className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {report.application.name}
                                </p>
                                <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                                  Ticket #{report.id.slice(-6)} · {report.application.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-700">
                              {report.reporter_email}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Hub user
                            </p>
                          </td>
                          <td className="max-w-md px-5 py-4">
                            <p className="line-clamp-2 text-sm leading-6 text-slate-700">
                              {report.message}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(report.status)}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusLabel(report.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            <time dateTime={report.created_at}>
                              {formatDate(report.created_at)}
                            </time>
                          </td>
                          <td className="px-5 py-4">
                            <Dropdown
                              value={report.status}
                              className="ml-auto w-36"
                              buttonClassName="text-xs"
                              disabled={updatingId === report.id}
                              options={statusOptions.map((status) => ({
                                value: status,
                                label: statusLabel(status),
                              }))}
                              onChange={(value) =>
                                void changeReport(
                                  report.id,
                                  value,
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
