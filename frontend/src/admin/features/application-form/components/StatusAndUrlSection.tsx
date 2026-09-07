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
        title="Alamat dan status"
        subtitle="Ke mana kartu ini membuka, dan apakah sedang bisa dipakai."
      />
      <div className={`${sectionBodyClass} grid gap-5 md:grid-cols-2`}>
        <label className={`${labelClass} md:col-span-2`}>
          Alamat aplikasi
          <span className={helperTextClass}>
            Halaman yang dibuka saat kartu diklik. Contoh:
            https://app.millenniaws.sch.id/mtss
          </span>
          <input
            className={inputClass}
            type="url"
            placeholder="https://..."
            value={form.href ?? ""}
            onChange={(event) => update("href", event.target.value)}
          />
        </label>

        <fieldset className="md:col-span-2">
          <legend className="text-sm font-medium text-slate-700">Status</legend>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {STATUSES.map((status) => (
              <label
                key={status.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  form.status === status.value
                    ? "border-primary/40 bg-primary/5"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  className="mt-1 h-4 w-4 border-slate-300 text-primary focus:ring-primary/20"
                  checked={form.status === status.value}
                  onChange={() => update("status", status.value)}
                />
                <span>
                  <span className="font-medium text-slate-800">{status.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {status.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={labelClass}>
          Urutan tampil
          <span className={helperTextClass}>
            Angka kecil tampil lebih dulu. Biarkan 0 kalau tidak penting.
          </span>
          <input
            className={inputClass}
            type="number"
            value={form.sortOrder}
            onChange={(event) => update("sortOrder", Number(event.target.value))}
          />
        </label>

        <label className="flex items-start gap-3 self-end rounded-md border border-slate-200 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
            checked={form.discoverable ?? true}
            onChange={(event) => update("discoverable", event.target.checked)}
          />
          <span>
            <span className="font-medium text-slate-800">Tampilkan di halaman Hub</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Matikan untuk menyembunyikan tanpa menghapus.
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
