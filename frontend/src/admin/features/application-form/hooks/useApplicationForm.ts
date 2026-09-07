import { useEffect, useState } from "react";
import type { AdminApplication, AdminApplicationInput } from "@/admin/api/adminApi";
import { formFromApplication } from "../utils/mapApplicationToForm";
import { slugify } from "../utils/slugify";

// Owns the editable form fields themselves: initial values from the
// application being edited (or a blank form for "add new"), a generic
// `update` setter, and the id the backend will derive from the name.
export function useApplicationForm(application?: AdminApplication | null) {
  const [form, setForm] = useState<AdminApplicationInput>(() =>
    formFromApplication(application),
  );
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setForm(formFromApplication(application));
    setFormError("");
  }, [application]);

  function update<K extends keyof AdminApplicationInput>(
    key: K,
    value: AdminApplicationInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const appId = application?.id || slugify(form.name);

  return { form, update, appId, formError, setFormError };
}
