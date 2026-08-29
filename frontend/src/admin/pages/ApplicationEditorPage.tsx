import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import ApplicationForm from "@/admin/components/ApplicationForm";
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
      <section className="mx-auto max-w-4xl">
        <Link
          to="/admin/catalog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Catalog
        </Link>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Catalog management
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {isEditing ? "Edit application" : "Add application"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola kartu aplikasi tanpa mengubah source code Hub.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-border/60 bg-card p-5 sm:p-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading form...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
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
