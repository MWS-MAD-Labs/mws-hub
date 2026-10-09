import type { AdminApplicationInput } from "@/admin/api/adminApi";
import {
  helperTextClass,
  inputClass,
  labelClass,
  sectionBodyClass,
  sectionClass,
  STATUSES,
} from "../constants";
import SectionHeading from "./SectionHeading";

type StatusAndUrlSectionProps = {
  form: AdminApplicationInput;
  update: <K extends keyof AdminApplicationInput>(
    key: K,
    value: AdminApplicationInput[K],
  ) => void;
};

// Step 3: where the card links to, and whether it's currently usable
// (active / new / under maintenance), plus display order and visibility.
export default function StatusAndUrlSection({ form, update }: StatusAndUrlSectionProps) {
  return (
    <section className={sectionClass}>
      <SectionHeading
        step={3}
        title="URL and Status"
        subtitle="Where the card opens and whether the application is currently available."
      />
      <div className={`${sectionBodyClass} grid gap-5 md:grid-cols-2`}>
        <label className={`${labelClass} md:col-span-2`}>
          Application URL
          <span className={helperTextClass}>
            Enter only the domain, optional port, and path. Hub adds HTTP in
            development and HTTPS in staging or production.
          </span>
          <input
            className={inputClass}
            type="text"
            placeholder="app.millenniaws.sch.id/mtss"
            value={form.href ?? ""}
            onChange={(event) => update("href", event.target.value)}
          />
          <span className={helperTextClass}>
            Example: <code className="rounded bg-[var(--admin-card-subtle)] px-1">localhost:3004</code>
            {" "}or{" "}
            <code className="rounded bg-[var(--admin-card-subtle)] px-1">app.millenniaws.sch.id/mtss</code>
          </span>
        </label>

        <fieldset className="md:col-span-2">
          <legend className="admin-heading text-sm font-bold text-[var(--admin-text)]">Status</legend>
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((status) => (
              <label
                key={status.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  form.status === status.value
                    ? "border-[var(--admin-brand)]/40 bg-[var(--admin-brand-soft)]"
                    : "border-[var(--admin-border)] hover:bg-[var(--admin-card-subtle)]"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  className="mt-1 h-4 w-4 border-[var(--admin-border-strong)] text-[var(--admin-brand)] focus:ring-[var(--admin-brand)]"
                  checked={form.status === status.value}
                  onChange={() => update("status", status.value)}
                />
                <span>
                  <span className="admin-heading font-bold text-[var(--admin-text)]">{status.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--admin-text-tertiary)]">
                    {status.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={labelClass}>
          Display Order
          <span className={helperTextClass}>
            Lower numbers appear first. Leave 0 when order is not important.
          </span>
          <input
            className={inputClass}
            type="number"
            value={form.sortOrder}
            onChange={(event) => update("sortOrder", Number(event.target.value))}
          />
        </label>

      </div>
    </section>
  );
}
