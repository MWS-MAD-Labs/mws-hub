import type { AdminApplicationInput } from "@/admin/api/adminApi";
import type { IconComponent } from "../types";

type CardPreviewProps = {
  form: AdminApplicationInput;
  derivedAudience: string;
  PreviewIcon: IconComponent;
};

// Shows the result of the choices below it, so nobody has to save and
// go look at the hub to find out what they built.
export default function CardPreview({ form, derivedAudience, PreviewIcon }: CardPreviewProps) {
  return (
    <aside className="overflow-hidden rounded-lg">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Preview</p>
        <p className="mt-0.5 text-xs text-slate-500">Tampilan kartu di Hub</p>
      </div>

      <div className="p-4">
        <div className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-slate-50/70 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-primary shadow-sm ring-1 ring-slate-200">
            <PreviewIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">
                {form.name || "Nama aplikasi"}
              </p>
              {form.status === "new" ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  New
                </span>
              ) : null}
              {form.status === "maintenance" ? (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Maintenance
                </span>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
              {form.description || "Deskripsi singkat aplikasi."}
            </p>
            <p className="mt-3 truncate text-[11px] text-slate-500">
              Terlihat oleh: {derivedAudience || "belum ada yang dipilih"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
