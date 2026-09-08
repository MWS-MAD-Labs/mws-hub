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
    return "Nama aplikasi wajib diisi.";
  }
  if (!form.category.trim()) {
    return "Pilih satu kategori.";
  }
  if ((form.allowedSources ?? []).length === 0) {
    return "Pilih minimal satu kelompok pengguna. Tanpa ini aplikasi tidak akan terlihat oleh siapa pun.";
  }
  if (!form.href?.trim()) {
    return "Alamat aplikasi wajib diisi.";
  }
  if (usesSso && !ssoBase.trim()) {
    return "Isi alamat backend aplikasi, atau matikan login lewat Hub.";
  }
  if (usesSso && !resolveSsoAppId(appId, form.ssoAppId)) {
    return "Isi kode SSO aplikasi, atau matikan login lewat Hub.";
  }

  return "";
}
