import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
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

  return (
    <AppShell>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Catalog management
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Applications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add and manage the applications shown in MWS Hub.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadApplications()}
              className="inline-flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm font-semibold hover:bg-card"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              to="/admin/catalog/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add application
            </Link>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border/60 bg-card">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Loading applications...
            </p>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm text-destructive">{error}</p>
              <button
                type="button"
                onClick={() => void loadApplications()}
                className="mt-3 text-sm font-semibold text-primary"
              >
                Try again
              </button>
            </div>
          ) : applications.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No applications found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Application</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Visibility</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{application.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {application.id}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {application.category}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium capitalize">
                          {statusLabel(application.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {application.discoverable ? (
                          <span className="text-emerald-600">Visible</span>
                        ) : (
                          <span className="text-muted-foreground">Hidden</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/admin/catalog/${encodeURIComponent(application.id)}/edit`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            title="Edit"
                            aria-label={`Edit ${application.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => void toggleDiscoverable(application)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            title={application.discoverable ? "Hide" : "Show"}
                            aria-label={
                              application.discoverable
                                ? `Hide ${application.name}`
                                : `Show ${application.name}`
                            }
                          >
                            {application.discoverable ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeApplication(application)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                            title="Delete"
                            aria-label={`Delete ${application.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
