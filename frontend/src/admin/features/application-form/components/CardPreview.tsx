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
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Tampilan kartu di Hub
      </p>
      <div className="mt-3 flex min-w-0 items-start gap-3 rounded-md border border-border/70 bg-background p-3">
        <PreviewIcon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {form.name || "Nama aplikasi"}
            </p>
            {form.status === "new" ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                New
              </span>
            ) : null}
            {form.status === "maintenance" ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                Maintenance
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {form.description || "Deskripsi singkat aplikasi."}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Terlihat oleh: {derivedAudience || "belum ada yang dipilih"}
          </p>
        </div>
      </div>
    </div>
  );
}
