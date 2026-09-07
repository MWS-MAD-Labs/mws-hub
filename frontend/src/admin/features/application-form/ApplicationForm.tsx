import type { FormEvent } from "react";
import { getAppIcon } from "@/data/hubCategories";
import type {
  AdminAccessOptions,
  AdminApplication,
  AdminApplicationInput,
} from "@/admin/api/adminApi";
import { useApplicationForm } from "./hooks/useApplicationForm";
import { useAccessControl } from "./hooks/useAccessControl";
import { useSsoConfig } from "./hooks/useSsoConfig";
import { useIconPicker } from "./hooks/useIconPicker";
import { normalizeKeywordParts } from "./utils/keywords";
import { validateApplicationForm } from "./utils/validateApplicationForm";
import CardPreview from "./components/CardPreview";
import IdentitySection from "./components/IdentitySection";
import AccessControlSection from "./components/AccessControlSection";
import StatusAndUrlSection from "./components/StatusAndUrlSection";
import SsoSection from "./components/SsoSection";
import FormActions from "./components/FormActions";

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
  const { form, update, appId, formError, setFormError } = useApplicationForm(application);
  const { iconQuery, setIconQuery, visibleIcons } = useIconPicker();

  const {
    accessQuery,
    setAccessQuery,
    activeAccessGroup,
    setActiveAccessGroup,
    customRule,
    setCustomRule,
    accessGroups,
    filteredAccessOptions,
    selectedAccessLabels,
    derivedAudience,
    toggleSource,
    removeSource,
    addCustomRule,
  } = useAccessControl({
    accessOptions,
    allowedSources: form.allowedSources ?? [],
    onChange: (sources) => update("allowedSources", sources),
    resetKey: application,
  });

  const { usesSso, setUsesSso, ssoBase, setSsoBase, resolve: resolveSso } =
    useSsoConfig(application);

  const PreviewIcon = getAppIcon(form.icon || "AppWindow");
  const keywordText = normalizeKeywordParts((form.keywords ?? []).join(",")).join(", ");
  const isEditing = Boolean(application);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const error = validateApplicationForm(form, { usesSso, ssoBase, appId });
    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    const sso = resolveSso(appId, form.ssoAppId);
    await onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      audience: derivedAudience,
      category: form.category.trim(),
      keywords: (form.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean),
      href: form.href?.trim() || null,
      ssoAppId: sso.ssoAppId,
      ssoEntryUrl: sso.ssoEntryUrl,
      ssoLogoutUrl: sso.ssoLogoutUrl,
      sortOrder: Number(form.sortOrder) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {formError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <CardPreview form={form} derivedAudience={derivedAudience} PreviewIcon={PreviewIcon} />

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

      <AccessControlSection
        accessGroups={accessGroups}
        activeAccessGroup={activeAccessGroup}
        setActiveAccessGroup={setActiveAccessGroup}
        accessQuery={accessQuery}
        setAccessQuery={setAccessQuery}
        filteredAccessOptions={filteredAccessOptions}
        selectedAccessLabels={selectedAccessLabels}
        allowedSources={form.allowedSources ?? []}
        toggleSource={toggleSource}
        removeSource={removeSource}
        customRule={customRule}
        setCustomRule={setCustomRule}
        addCustomRule={addCustomRule}
        centralRulePrefixes={accessOptions.centralRulePrefixes}
      />

      <StatusAndUrlSection form={form} update={update} />

      <SsoSection
        usesSso={usesSso}
        setUsesSso={setUsesSso}
        ssoBase={ssoBase}
        setSsoBase={setSsoBase}
        appId={appId}
        formSsoAppId={form.ssoAppId}
        update={update}
      />

      <FormActions isSaving={isSaving} isEditing={isEditing} onCancel={onCancel} />
    </form>
  );
}
