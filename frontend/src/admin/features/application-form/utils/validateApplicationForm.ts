import type { AdminApplicationInput } from "@/admin/api/adminApi";
import { resolveSsoAppId } from "./ssoUrls";

type SsoState = {
  usesSso: boolean;
  ssoBase: string;
  appId: string;
};

// Pure validation, no state - returns an error message for the first rule
// broken, or "" when the form is good to submit. Kept separate from the
// hook so the rules can be unit tested without rendering anything.
export function validateApplicationForm(
  form: AdminApplicationInput,
  { usesSso, ssoBase, appId }: SsoState,
): string {
  if (!form.name.trim()) {
    return "Application name is required.";
  }
  if (!form.category.trim()) {
    return "Select a category.";
  }
  if (form.status !== "coming_soon" && !form.href?.trim()) {
    return "Application URL is required unless the status is Coming Soon.";
  }
  if (usesSso && !ssoBase.trim()) {
    return "Enter the application backend URL or turn off Hub SSO.";
  }
  if (usesSso && !resolveSsoAppId(appId, form.ssoAppId)) {
    return "Enter the SSO application ID or turn off Hub SSO.";
  }
  if (!form.centralEntitlementAppId?.trim()) {
    return "Central Application ID is required.";
  }

  return "";
}
