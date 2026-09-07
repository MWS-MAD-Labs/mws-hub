import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import { getAppIcon } from "@/data/hubCategories";
import {
  adminApi,
  type AdminApplication,
  type AdminApplicationInput,
} from "@/admin/api/adminApi";

function statusLabel(status: AdminApplication["status"]) {
  return status.replace("_", " ");
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadApplications() {
    setIsLoading(true);
    setError("");
    try {
      setApplications(await adminApi.listApplications());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load applications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  async function removeApplication(application: AdminApplication) {
    if (!window.confirm(`Delete ${application.name}?`)) return;
    try {
      await adminApi.deleteApplication(application.id);
      toast.success("Application deleted");
      await loadApplications();
    } catch (removeError) {
      toast.error(
        removeError instanceof Error
          ? removeError.message
          : "Failed to delete application.",
      );
    }
  }

  async function toggleDiscoverable(application: AdminApplication) {
    try {
      await adminApi.updateApplication(application.id, {
        name: application.name,
        icon: application.icon,
        description: application.description,
        audience: application.audience,
        category: application.category,
        keywords: application.keywords,
        href: application.href,
        external: application.external,
        status:
          application.status.toLowerCase() as AdminApplicationInput["status"],
        discoverable: !application.discoverable,
        allowedSources: application.allowed_sources,
        ssoAppId: application.sso_app_id,
        ssoEntryUrl: application.sso_entry_url,
        ssoLogoutUrl: application.sso_logout_url,
        sortOrder: application.sort_order,
      });
      toast.success(
        application.discoverable ? "Application hidden" : "Application visible",
      );
      await loadApplications();
    } catch (toggleError) {
      toast.error(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update visibility.",
      );
    }
  }

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return applications;

    return applications.filter((application) =>
      [
        application.name,
        application.id,
        application.description,
        application.audience,
        application.category,
        application.status,
        application.discoverable ? "visible" : "hidden",
        ...application.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [applications, searchQuery]);

  return (
    <AppShell>
      <section className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="w-full p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Catalog management
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Applications
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Add and manage the applications shown in MWS Hub.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <nav className="flex items-center gap-2 text-sm text-slate-500">
                <Link to="/admin" className="hover:text-slate-900">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="font-medium text-slate-900">Applications</span>
              </nav>
              <div className="flex gap-2">
                <Link
                  to="/admin/catalog/new"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Add application
                </Link>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Table toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  All applications
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredApplications.length} applications
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  placeholder="Search applications..."
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-64"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />

                <button
                  type="button"
                  onClick={() => void loadApplications()}
                  disabled={isLoading}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  <p>Refresh</p>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Application
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Category
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Visibility
                    </th>
                    <th className="w-24 px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                        Loading applications...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center">
                        <p className="text-sm text-destructive">{error}</p>
                        <button
                          type="button"
                          onClick={() => void loadApplications()}
                          className="mt-3 text-sm font-medium text-primary"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                        {searchQuery.trim()
                          ? "No applications match your search."
                          : "No applications found."}
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((application) => {
                    const AppIcon = getAppIcon(application.icon || "AppWindow");

                    return (
                      <tr
                        key={application.id}
                        className="group transition-colors hover:bg-slate-50/60"
                      >
                        {/* Application */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-primary">
                              <AppIcon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {application.name}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                                {application.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                            {application.category}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-slate-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {statusLabel(application.status)}
                          </span>
                        </td>

                        {/* Visibility */}
                        <td className="px-5 py-4">
                          {application.discoverable ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              <Eye className="h-3.5 w-3.5" />
                              Visible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              <EyeOff className="h-3.5 w-3.5" />
                              Hidden
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <Link
                              to={`/admin/catalog/${encodeURIComponent(application.id)}/edit`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                void toggleDiscoverable(application)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                              title={application.discoverable ? "Hide" : "Show"}
                            >
                              {application.discoverable ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void removeApplication(application)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
