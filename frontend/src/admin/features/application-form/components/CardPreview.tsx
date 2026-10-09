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
    <aside className="overflow-hidden rounded-xl">
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <p className="admin-heading text-sm font-bold text-[var(--admin-text)]">Preview</p>
        <p className="mt-0.5 text-xs text-[var(--admin-text-tertiary)]">How the application appears in Hub</p>
      </div>

      <div className="p-4">
        <div className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-card)] text-[var(--admin-brand)] ring-1 ring-[var(--admin-border)]">
            <PreviewIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="admin-heading truncate text-sm font-bold text-[var(--admin-text)]">
                {form.name || "Application name"}
              </p>
              {form.status === "new" ? (
                <span className="rounded bg-[var(--admin-sky)]/30 px-1.5 py-0.5 text-[10px] font-bold text-[var(--admin-sky-text)]">
                  New
                </span>
              ) : null}
              {form.status === "maintenance" ? (
                <span className="rounded bg-[var(--admin-gold-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--admin-gold-text)]">
                  Maintenance
                </span>
              ) : null}
              {form.status === "coming_soon" ? <span className="rounded bg-[var(--admin-navy-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--admin-navy)]">Coming soon</span> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--admin-text-secondary)]">
              {form.description || "Short application description."}
            </p>
            <p className="mt-3 truncate text-[11px] text-[var(--admin-text-tertiary)]">
              Audience: {derivedAudience || "not selected"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
