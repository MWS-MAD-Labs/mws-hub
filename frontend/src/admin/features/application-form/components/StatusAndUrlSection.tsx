import type { AdminApplicationInput } from "@/admin/api/adminApi";
import { inputClass, sectionClass, STATUSES } from "../constants";
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Alamat aplikasi
          <span className="block text-xs font-normal text-muted-foreground">
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

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">Status</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {STATUSES.map((status) => (
              <label
                key={status.value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${
                  form.status === status.value
                    ? "border-primary bg-primary/5"
                    : "border-border/60"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  className="mt-1"
                  checked={form.status === status.value}
                  onChange={() => update("status", status.value)}
                />
                <span>
                  <span className="font-medium">{status.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {status.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="text-sm font-medium">
          Urutan tampil
          <span className="block text-xs font-normal text-muted-foreground">
            Angka kecil tampil lebih dulu. Biarkan 0 kalau tidak penting.
          </span>
          <input
            className={inputClass}
            type="number"
            value={form.sortOrder}
            onChange={(event) => update("sortOrder", Number(event.target.value))}
          />
        </label>

        <label className="flex items-start gap-2 self-end text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.discoverable ?? true}
            onChange={(event) => update("discoverable", event.target.checked)}
          />
          <span>
            <span className="font-medium">Tampilkan di halaman Hub</span>
            <span className="block text-xs text-muted-foreground">
              Matikan untuk menyembunyikan tanpa menghapus.
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
