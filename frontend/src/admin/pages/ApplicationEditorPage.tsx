import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import ApplicationForm from "@/admin/features/application-form/ApplicationForm";
import {
  adminApi,
  type AdminAccessOptions,
  type AdminApplication,
  type AdminApplicationInput,
} from "@/admin/api/adminApi";

const emptyAccessOptions: AdminAccessOptions = {
  base: [],
  central: {
    units: [],
    jobPositions: [],
    jobLevels: [],
  },
  centralRulePrefixes: [],
};

export default function ApplicationEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [accessOptions, setAccessOptions] =
    useState<AdminAccessOptions>(emptyAccessOptions);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const [options, loadedApplication] = await Promise.all([
          adminApi.accessOptions(),
          id ? adminApi.getApplication(id) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setAccessOptions(options);
          setApplication(loadedApplication);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load application form.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function saveApplication(input: AdminApplicationInput) {
    setIsSaving(true);
    try {
      if (id) {
        await adminApi.updateApplication(id, input);
        toast.success("Application updated");
      } else {
        await adminApi.createApplication(input);
        toast.success("Application created");
      }
      navigate("/admin/catalog");
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

  return (
    <AppShell>
      <section className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="w-full p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Catalog management
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {isEditing ? "Edit Application" : "Add Application"}
              </h1>
            </div>

            <nav className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/admin" className="hover:text-slate-900">
                Dashboard
              </Link>
              <span>/</span>
              <Link to="/admin/catalog" className="hover:text-slate-900">
                Applications
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-900">
                {isEditing ? "Edit" : "Add"}
              </span>
            </nav>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading form...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-white p-6 text-sm text-destructive shadow-sm">
              {error}
            </div>
          ) : (
            <ApplicationForm
              application={application}
              accessOptions={accessOptions}
              isSaving={isSaving}
              onCancel={() => navigate("/admin/catalog")}
              onSubmit={saveApplication}
            />
          )}
        </div>
      </section>
    </AppShell>
  );
}
