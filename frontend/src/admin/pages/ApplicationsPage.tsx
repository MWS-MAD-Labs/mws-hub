import { useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, EyeOff, Eye, X } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import ApplicationForm from "@/admin/components/ApplicationForm";
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
  const [editing, setEditing] = useState<AdminApplication | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  function openCreate() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(application: AdminApplication) {
    setEditing(application);
    setIsFormOpen(true);
  }

  async function saveApplication(input: AdminApplicationInput) {
    setIsSaving(true);
    try {
      if (editing) {
        await adminApi.updateApplication(editing.id, input);
        toast.success("Application updated");
      } else {
        await adminApi.createApplication(input);
        toast.success("Application created");
      }
      setIsFormOpen(false);
      await loadApplications();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save application.",
      );
    } finally {
      setIsSaving(false);
    }
  }

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
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add application
            </button>
          </div>
        </div>

        {isFormOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsFormOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="application-form-title"
              className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-xl border border-border/60 bg-card shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border/60 bg-card px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Catalog management
                  </p>
                  <h2
                    id="application-form-title"
                    className="mt-1 text-lg font-semibold"
                  >
                    {editing ? `Edit ${editing.name}` : "Add application"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close application form"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 sm:p-6">
                <ApplicationForm
                  application={editing}
                  isSaving={isSaving}
                  onCancel={() => setIsFormOpen(false)}
                  onSubmit={saveApplication}
                />
              </div>
            </div>
          </div>
        ) : null}

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
                          <button
                            type="button"
                            onClick={() => openEdit(application)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                            title="Edit"
                            aria-label={`Edit ${application.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
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
