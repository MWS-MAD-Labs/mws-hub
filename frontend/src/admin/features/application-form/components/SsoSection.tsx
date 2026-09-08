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
  update,
}: SsoSectionProps) {
  const ssoAppId = resolveSsoAppId(appId, formSsoAppId ?? "");

  return (
    <section className={sectionClass}>
      <SectionHeading
        step={4}
        title="Login lewat Hub"
        subtitle="Opsional. Hanya untuk aplikasi yang sudah dibuatkan endpoint SSO oleh developernya."
      />

      <div className={sectionBodyClass}>
        <label className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-4 text-sm">
          <span>
            <span className="font-medium text-slate-800">
              Pengguna langsung masuk tanpa login ulang
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Biarkan mati kalau aplikasi ini hanya dibuka sebagai link biasa.
              Sebagian besar aplikasi tidak memerlukan ini.
            </span>
          </span>
          <span className="relative mt-0.5 inline-flex">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={usesSso}
              onChange={(event) => setUsesSso(event.target.checked)}
            />
            <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-primary" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>

        {usesSso ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Kode SSO aplikasi
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
              Alamat backend aplikasi
              <span className={helperTextClass}>
                Alamat server atau halaman awal app. Contoh:
                https://app-stg.mws.web.id/select-role
              </span>
              <input
                className={inputClass}
                type="url"
                placeholder="https://..."
                value={ssoBase}
                onChange={(event) => setSsoBase(event.target.value)}
              />
            </label>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500 md:col-span-2">
              <p className="font-medium text-slate-900">
                Yang akan disimpan otomatis
              </p>
              <p className="mt-2">
                Kode SSO:{" "}
                <code className="rounded bg-white px-1 text-slate-700">
                  {ssoAppId || "-"}
                </code>{" "}
                &nbsp;|&nbsp; Endpoint:{" "}
                <code className="rounded bg-white px-1 text-slate-700">
                  {ssoEntryFromBase(ssoBase) || "-"}
                </code>
              </p>
              <p className="mt-1">
                Logout:{" "}
                <code className="rounded bg-white px-1 text-slate-700">
                  {ssoLogoutFromBase(ssoBase) || "-"}
                </code>{" "}
                <span className="text-slate-400">
                  (opsional, dipakai saat sign-out dari Hub)
                </span>
              </p>
              <p className="mt-2">
                Developer aplikasi tujuan perlu memasang{" "}
                <code className="rounded bg-white px-1 text-slate-700">
                  HUB_SSO_PUBLIC_KEY
                </code>{" "}
                dan endpoint{" "}
                <code className="rounded bg-white px-1 text-slate-700">
                  /auth/sso
                </code>{" "}
                sebelum ini bisa dipakai.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
