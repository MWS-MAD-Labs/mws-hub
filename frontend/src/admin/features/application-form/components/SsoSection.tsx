import type { AdminApplicationInput } from "@/admin/api/adminApi";
import { inputClass, sectionClass } from "../constants";
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

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={usesSso}
          onChange={(event) => setUsesSso(event.target.checked)}
        />
        <span>
          <span className="font-medium">
            Pengguna langsung masuk tanpa login ulang
          </span>
          <span className="block text-xs text-muted-foreground">
            Biarkan mati kalau aplikasi ini hanya dibuka sebagai link biasa.
            Sebagian besar aplikasi tidak memerlukan ini.
          </span>
        </span>
      </label>

      {usesSso ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Kode SSO aplikasi
            <span className="block text-xs font-normal text-muted-foreground">
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

          <label className="block text-sm font-medium">
            Alamat backend aplikasi
            <span className="block text-xs font-normal text-muted-foreground">
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

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Yang akan disimpan otomatis
            </p>
            <p className="mt-1">
              Kode SSO: <code className="rounded bg-muted px-1">{ssoAppId || "-"}</code>{" "}
              &nbsp;|&nbsp; Endpoint:{" "}
              <code className="rounded bg-muted px-1">
                {ssoEntryFromBase(ssoBase) || "-"}
              </code>
            </p>
            <p className="mt-1">
              Logout:{" "}
              <code className="rounded bg-muted px-1">
                {ssoLogoutFromBase(ssoBase) || "-"}
              </code>{" "}
              <span className="text-muted-foreground/80">
                (opsional, dipakai saat sign-out dari Hub)
              </span>
            </p>
            <p className="mt-2">
              Developer aplikasi tujuan perlu memasang{" "}
              <code className="rounded bg-muted px-1">HUB_SSO_PUBLIC_KEY</code>{" "}
              dan endpoint <code className="rounded bg-muted px-1">/auth/sso</code>{" "}
              sebelum ini bisa dipakai.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
