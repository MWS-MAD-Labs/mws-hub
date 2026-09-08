import { useEffect, useState } from "react";
import type { AdminApplication } from "@/admin/api/adminApi";
import {
  baseFromSsoEntry,
  resolveSsoAppId,
  ssoEntryFromBase,
  ssoLogoutFromBase,
} from "../utils/ssoUrls";

// Owns the "login lewat Hub" toggle and the single backend-base-URL field it
// exposes, and knows how to turn that base URL into the three values the
// API actually wants (app id, entry URL, logout URL) at submit time.
export function useSsoConfig(application: AdminApplication | null | undefined) {
  const [usesSso, setUsesSso] = useState(Boolean(application?.sso_app_id));
  const [ssoBase, setSsoBase] = useState(
    baseFromSsoEntry(application?.sso_entry_url ?? ""),
  );

  useEffect(() => {
    setUsesSso(Boolean(application?.sso_app_id));
    setSsoBase(baseFromSsoEntry(application?.sso_entry_url ?? ""));
  }, [application]);

  function resolve(appId: string, rawSsoAppId?: string | null) {
    if (!usesSso) {
      return { usesSso: false as const, ssoAppId: null, ssoEntryUrl: null, ssoLogoutUrl: null };
    }
    return {
      usesSso: true as const,
      ssoAppId: resolveSsoAppId(appId, rawSsoAppId),
      ssoEntryUrl: ssoEntryFromBase(ssoBase),
      ssoLogoutUrl: ssoLogoutFromBase(ssoBase) || null,
    };
  }

  return { usesSso, setUsesSso, ssoBase, setSsoBase, resolve };
}
