import type {
  AdminApplication,
  AdminApplicationInput,
  AdminApplicationStatus,
} from "@/admin/api/adminApi";
import { emptyForm } from "../constants";
import { displayApplicationUrl } from "./applicationUrls";

export function formFromApplication(
  application?: AdminApplication | null,
): AdminApplicationInput {
  if (!application) return emptyForm;
  return {
    id: application.id,
    name: application.name,
    icon: application.icon,
    description: application.description,
    audience: application.audience,
    category: application.category,
    keywords: application.keywords,
    href: displayApplicationUrl(application.href),
    external: application.external,
    status: application.status.toLowerCase() as Lowercase<AdminApplicationStatus>,
    discoverable: application.discoverable,
    allowedSources: application.allowed_sources,
    ssoAppId: application.sso_app_id ?? "",
    ssoEntryUrl: application.sso_entry_url ?? "",
    ssoLogoutUrl: application.sso_logout_url ?? "",
    centralEntitlementAppId:
      application.sso_central_entitlement_app_id ?? "",
    sortOrder: application.sort_order,
  };
}
