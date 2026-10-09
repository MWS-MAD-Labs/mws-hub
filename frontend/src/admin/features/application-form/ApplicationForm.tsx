import { useState, type FormEvent } from "react";
import { getAppIcon } from "@/data/hubCategories";
import type {
  AdminAccessOptions,
  AdminApplication,
  AdminApplicationInput,
} from "@/admin/api/adminApi";
import { useApplicationForm } from "./hooks/useApplicationForm";
import { useSsoConfig } from "./hooks/useSsoConfig";
import { useIconPicker } from "./hooks/useIconPicker";
import { normalizeKeywordParts } from "./utils/keywords";
import { validateApplicationForm } from "./utils/validateApplicationForm";
import { normalizeApplicationUrl } from "./utils/applicationUrls";
import CardPreview from "./components/CardPreview";
import IdentitySection from "./components/IdentitySection";
import StatusAndUrlSection from "./components/StatusAndUrlSection";
import SsoSection from "./components/SsoSection";
import FormActions from "./components/FormActions";
import AdminConfirmDialog from "@/admin/components/ui/AdminConfirmDialog";

type ApplicationFormProps = {
  application?: AdminApplication | null;
  accessOptions: AdminAccessOptions;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: AdminApplicationInput) => Promise<void>;
};

export default function ApplicationForm({
  application,
  accessOptions,
  isSaving,
  onCancel,
  onSubmit,
}: ApplicationFormProps) {
  const { form, update, appId, formError, setFormError } =
    useApplicationForm(application);
  const { iconQuery, setIconQuery, visibleIcons } = useIconPicker();

  void accessOptions;
  const derivedAudience = "Central Application Access";

  const {
    usesSso,
    setUsesSso,
    ssoBase,
    setSsoBase,
    resolve: resolveSso,
  } = useSsoConfig(application);

  const PreviewIcon = getAppIcon(form.icon || "AppWindow");
  const keywordText = normalizeKeywordParts(
    (form.keywords ?? []).join(","),
  ).join(", ");
  const isEditing = Boolean(application);
  const [pendingInput, setPendingInput] = useState<AdminApplicationInput | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const error = validateApplicationForm(form, { usesSso, ssoBase, appId });
    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    const sso = resolveSso(
      appId,
      form.ssoAppId,
      form.centralEntitlementAppId,
    );
    const input: AdminApplicationInput = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      audience: derivedAudience,
      allowedSources: form.allowedSources?.length ? form.allowedSources : ["public"],
      discoverable: true,
      category: form.category.trim(),
      keywords: (form.keywords ?? [])
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      href: form.href?.trim() ? normalizeApplicationUrl(form.href) : null,
      ssoAppId: sso.ssoAppId,
      ssoEntryUrl: sso.ssoEntryUrl,
      ssoLogoutUrl: sso.ssoLogoutUrl,
      centralEntitlementAppId: sso.centralEntitlementAppId,
      sortOrder: Number(form.sortOrder) || 0,
    };
    if (application && isCriticalChange(application, input)) {
      setPendingInput(input);
      return;
    }
    await onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError ? (
        <p className="rounded-lg border border-[var(--admin-rose)]/30 bg-[var(--admin-rose-soft)] px-4 py-3 text-sm text-[var(--admin-rose)]">
          {formError}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT — FORM */}
        <div className="min-w-0 space-y-5">
          <IdentitySection
            form={form}
            update={update}
            appId={appId}
            isEditing={isEditing}
            keywordText={keywordText}
            iconQuery={iconQuery}
            setIconQuery={setIconQuery}
            visibleIcons={visibleIcons}
            PreviewIcon={PreviewIcon}
          />

          <StatusAndUrlSection form={form} update={update} />

          <SsoSection
            usesSso={usesSso}
            setUsesSso={setUsesSso}
            ssoBase={ssoBase}
            setSsoBase={setSsoBase}
            appId={appId}
            formSsoAppId={form.ssoAppId}
            centralEntitlementAppId={form.centralEntitlementAppId}
            update={update}
          />
        </div>

        {/* RIGHT — PREVIEW + ACTIONS */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]">
            <CardPreview
              form={form}
              derivedAudience={derivedAudience}
              PreviewIcon={PreviewIcon}
            />

            <div className="p-4">
              <FormActions
                isSaving={isSaving}
                isEditing={isEditing}
                onCancel={onCancel}
              />
            </div>
          </div>
        </aside>
      </div>
      <AdminConfirmDialog open={Boolean(pendingInput)} onOpenChange={(open) => { if (!open) setPendingInput(null); }} title={`Save Critical Changes to “${form.name}”?`} description="This update changes application availability, launch destination, Central access, or SSO configuration. Incorrect values can prevent eligible users from opening the application." confirmLabel="Save Changes" cancelLabel="Review Changes" pending={isSaving} onConfirm={() => { if (pendingInput) void onSubmit(pendingInput).then(() => setPendingInput(null)); }} />
    </form>
  );
}

function isCriticalChange(application: AdminApplication, input: AdminApplicationInput) {
  const oldStatus = application.status.toLowerCase();
  const oldAvailable = oldStatus === "active" || oldStatus === "new";
  const newAvailable = input.status === "active" || input.status === "new";
  const oldHost = safeHost(application.href);
  const newHost = safeHost(input.href);
  return oldAvailable !== newAvailable || oldHost !== newHost || application.sso_app_id !== (input.ssoAppId || null) || application.sso_entry_url !== (input.ssoEntryUrl || null) || application.sso_central_entitlement_app_id !== (input.centralEntitlementAppId || null);
}

function safeHost(value: string | null | undefined) {
  try { return value ? new URL(value).host : ""; } catch { return value || ""; }
}
