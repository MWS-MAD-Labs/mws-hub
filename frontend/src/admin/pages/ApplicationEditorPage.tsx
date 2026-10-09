import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import AppShell from "@/admin/components/layout/AppShell";
import AdminPageHeader from "@/admin/components/ui/AdminPageHeader";
import ApplicationForm from "@/admin/features/application-form/ApplicationForm";
import { adminApi, type AdminApplication, type AdminApplicationInput } from "@/admin/api/adminApi";

export default function ApplicationEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true); setError("");
    try {
      const loadedApplication = id ? await adminApi.getApplication(id) : null;
      setApplication(loadedApplication);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Failed to load application form."); }
    finally { setIsLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function saveApplication(input: AdminApplicationInput) {
    setIsSaving(true);
    try {
      if (id) { await adminApi.updateApplication(id, input); toast.success("Application updated"); }
      else { await adminApi.createApplication(input); toast.success("Application created"); }
      navigate("/admin/catalog");
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : "Failed to save application."); }
    finally { setIsSaving(false); }
  }

  return <AppShell><section className="-mx-4 -my-6 min-h-[calc(100vh-3.75rem)] bg-[var(--admin-bg)] px-5 py-7 sm:-mx-6 sm:px-7 lg:-mx-8 lg:px-10 lg:py-9"><div className="mx-auto max-w-[1360px]">
    <AdminPageHeader eyebrow="Catalog Management" title={isEditing ? "Edit Application" : "Add Application"} description={isEditing ? "Update application details, status, and SSO configuration." : "Create a new application for the MWS Hub catalog."} actions={<Link to="/admin/catalog" className="admin-focus admin-heading inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-4 text-xs font-bold"><ArrowLeft className="h-4 w-4" />Back to Catalog</Link>} />
    <div className="mt-7">{isLoading ? <div className="grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="h-[620px] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]" /><div className="h-72 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]" /></div> : error ? <div className="rounded-xl border border-[var(--admin-rose)]/30 bg-[var(--admin-card)] p-6"><p className="admin-heading text-sm font-bold">Application Form Could Not Be Loaded</p><p className="mt-2 text-sm text-[var(--admin-text-secondary)]">{error}</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void load()} className="admin-focus admin-heading inline-flex h-10 items-center gap-2 rounded-full bg-[var(--admin-brand)] px-4 text-xs font-bold text-white dark:text-[#241718]"><RefreshCw className="h-4 w-4" />Try Again</button><Link to="/admin/catalog" className="admin-focus admin-heading inline-flex h-10 items-center rounded-lg border border-[var(--admin-border-strong)] px-4 text-xs font-bold">Back to Catalog</Link></div></div> : <ApplicationForm application={application} accessOptions={{ base: [], central: { units: [], jobPositions: [], jobLevels: [] }, centralRulePrefixes: [] }} isSaving={isSaving} onCancel={() => navigate("/admin/catalog")} onSubmit={saveApplication} />}</div>
  </div></section></AppShell>;
}
