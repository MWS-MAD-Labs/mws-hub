import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import Dropdown from "@/admin/components/ui/Dropdown";
import { adminApi, type AdminAccessRequest } from "@/admin/api/adminApi";

const statusOptions: AdminAccessRequest["status"][] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

function statusLabel(status: AdminAccessRequest["status"]) {
  return status.replace("_", " ").toLowerCase();
}

function statusClass(status: AdminAccessRequest["status"]) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function statusIcon(status: AdminAccessRequest["status"]) {
  if (status === "APPROVED") return CheckCircle2;
  if (status === "REJECTED") return XCircle;
  return Clock3;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AccessRequest() {
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  async function loadRequests() {
    setIsLoading(true);
    setError("");
    try {
      setRequests(await adminApi.listAccessRequests());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load access requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function changeRequest(
    id: string,
    status: AdminAccessRequest["status"],
  ) {
    setUpdatingId(id);
    try {
      await adminApi.updateAccessRequest(id, status);
      await loadRequests();
      toast.success("Access request updated");
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update access request.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return requests;

    return requests.filter((request) =>
      [
        request.application.name,
        request.application.id,
        request.requester_email,
        request.reason,
        request.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [requests, searchQuery]);

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
                Access Requests
              </h1>
            </div>
            <nav className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/admin" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-900">
                Access Requests
              </span>
            </nav>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  All requests
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredRequests.length} requests
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search requests..."
                    className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-64"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void loadRequests()}
                  disabled={isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Application
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Requester
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Reason
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Requested
                    </th>
                    <th className="w-44 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Loading access requests...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <p className="text-sm text-destructive">{error}</p>
                        <button
                          type="button"
                          onClick={() => void loadRequests()}
                          className="mt-3 text-sm font-medium text-primary"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        {searchQuery.trim()
                          ? "No access requests match your search."
                          : "No access requests found."}
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((request) => {
                      const StatusIcon = statusIcon(request.status);

                      return (
                        <tr
                          key={request.id}
                          className="group transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-primary">
                                <ShieldQuestion className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {request.application.name}
                                </p>
                                <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                                  {request.application.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {request.requester_email}
                          </td>
                          <td className="max-w-md px-5 py-4">
                            <p className="line-clamp-2 text-slate-600">
                              {request.reason || "No reason provided"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(request.status)}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusLabel(request.status)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-5 py-4">
                            <Dropdown
                              value={request.status}
                              className="ml-auto w-36"
                              buttonClassName="text-xs"
                              disabled={updatingId === request.id}
                              options={statusOptions.map((status) => ({
                                value: status,
                                label: statusLabel(status),
                              }))}
                              onChange={(value) =>
                                void changeRequest(
                                  request.id,
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
