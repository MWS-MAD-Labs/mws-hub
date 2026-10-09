import type { AdminApplicationInput } from "@/admin/api/adminApi";
import {
  helperTextClass,
  inputClass,
  labelClass,
  sectionBodyClass,
  sectionClass,
} from "../constants";
import { resolveSsoAppId, ssoEntryFromBase, ssoLogoutFromBase } from "../utils/ssoUrls";
import SectionHeading from "./SectionHeading";

type SsoSectionProps = {
  usesSso: boolean;
  setUsesSso: (value: boolean) => void;
  ssoBase: string;
  setSsoBase: (value: string) => void;
  appId: string;
  formSsoAppId: AdminApplicationInput["ssoAppId"];
  centralEntitlementAppId: AdminApplicationInput["centralEntitlementAppId"];
  update: <K extends keyof AdminApplicationInput>(
    key: K,
    value: AdminApplicationInput[K],
  ) => void;
};

// Step 4 (optional): lets an app skip Hub's re-login screen entirely. Only
// meaningful for apps whose developer already implemented the /auth/sso
// and /auth/logout-silent endpoints.
export default function SsoSection({
  usesSso,
  setUsesSso,
  ssoBase,
  setSsoBase,
  appId,
  formSsoAppId,
  centralEntitlementAppId,
  update,
}: SsoSectionProps) {
  const ssoAppId = resolveSsoAppId(appId, formSsoAppId ?? "");

  return (
    <section className={sectionClass}>
      <SectionHeading
        step={4}
        title="Hub Single Sign-On"
        subtitle="Optional. Enable only when the application implements the Hub SSO endpoints."
      />

      <div className={`${sectionBodyClass} space-y-5`}>
        <label className={labelClass}>
          Central Application ID
          <span className={helperTextClass}>
            Required. This application must exist in Central Application Access.
          </span>
          <input
            className={inputClass}
            type="text"
            placeholder={appId || "exima"}
            value={centralEntitlementAppId ?? ""}
            onChange={(event) => update("centralEntitlementAppId", event.target.value)}
          />
        </label>

        <label className="flex items-start justify-between gap-4 rounded-lg border border-[var(--admin-border)] p-4 text-sm">
          <span>
            <span className="admin-heading font-bold text-[var(--admin-text)]">
              Sign Users In Without Another Login
            </span>
            <span className="mt-1 block text-xs leading-5 text-[var(--admin-text-tertiary)]">
              Keep this off when the application is opened as a normal link.
            </span>
          </span>
          <span className="relative mt-0.5 inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={usesSso}
              onChange={(event) => setUsesSso(event.target.checked)}
            />
            <span className="h-6 w-11 rounded-full bg-[var(--admin-border-strong)] transition peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--admin-brand)] peer-checked:bg-[var(--admin-brand)]" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--admin-card)] shadow transition peer-checked:translate-x-5" />
          </span>
        </label>

        {usesSso ? (
          <div className="grid gap-5 border-t border-[var(--admin-border)] pt-5 md:grid-cols-2">
            <label className={labelClass}>
              SSO Application ID
              <span className={helperTextClass}>
                Ambil dari verifier/config aplikasi tujuan; nilainya harus sama
                dengan audience token yang app itu terima.
              </span>
              <input
                className={inputClass}
                type="text"
                placeholder={appId || "daily-checkin"}
                value={formSsoAppId ?? ""}
                onChange={(event) => update("ssoAppId", event.target.value)}
              />
            </label>

            <label className={labelClass}>
              Application Backend Domain
              <span className={helperTextClass}>
                Enter only the domain, optional port, and base path. Hub adds HTTP
                in development and HTTPS in staging or production.
              </span>
              <input
                className={inputClass}
                type="text"
                inputMode="url"
                placeholder="app.mws.web.id"
                value={ssoBase}
                onChange={(event) => setSsoBase(event.target.value)}
              />
              <span className={helperTextClass}>
                Example input: <code className="rounded bg-[var(--admin-card-subtle)] px-1">localhost:3003</code>
                {" "}or{" "}
                <code className="rounded bg-[var(--admin-card-subtle)] px-1">app.mws.web.id</code>
              </span>
            </label>

            <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] p-4 text-xs leading-5 text-[var(--admin-text-tertiary)] md:col-span-2">
              <p className="admin-heading font-bold text-[var(--admin-text)]">
                Generated Configuration
              </p>
              <p className="mt-2">
                SSO ID:{" "}
                <code className="rounded bg-[var(--admin-card)] px-1 text-[var(--admin-text-secondary)]">
                  {ssoAppId || "-"}
                </code>{" "}
                &nbsp;|&nbsp; Endpoint:{" "}
                <code className="break-all rounded bg-[var(--admin-card)] px-1 text-[var(--admin-text-secondary)]">
                  {ssoEntryFromBase(ssoBase) || "-"}
                </code>
              </p>
              <p className="mt-1">
                Logout:{" "}
                <code className="break-all rounded bg-[var(--admin-card)] px-1 text-[var(--admin-text-secondary)]">
                  {ssoLogoutFromBase(ssoBase) || "-"}
                </code>{" "}
                <span className="text-[var(--admin-text-tertiary)]">
                  (optional, used during Hub sign-out)
                </span>
              </p>
              <p className="mt-2">
                The target application must configure{" "}
                <code className="rounded bg-[var(--admin-card)] px-1 text-[var(--admin-text-secondary)]">
                  HUB_SSO_PUBLIC_KEY
                </code>{" "}
                and the{" "}
                <code className="rounded bg-[var(--admin-card)] px-1 text-[var(--admin-text-secondary)]">
                  /auth/sso
                </code>{" "}
                endpoint before SSO can be used.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
