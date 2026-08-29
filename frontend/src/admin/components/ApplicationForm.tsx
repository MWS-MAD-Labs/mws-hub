import { useEffect, useMemo, useState } from "react";
import type {
  AdminAccessSource,
  AdminApplication,
  AdminApplicationInput,
  AdminApplicationStatus,
} from "@/admin/api/adminApi";
import { HUB_CATEGORIES, HUB_ICONS, getAppIcon } from "@/data/hubCategories";

type ApplicationFormProps = {
  application?: AdminApplication | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (input: AdminApplicationInput) => Promise<void>;
};

// Every status the form offers says what it does to the card, not what it is
// called in the database. "Maintenance" on its own tells nobody that the link
// stops working.
const STATUSES: Array<{
  value: Lowercase<AdminApplicationStatus>;
  label: string;
  hint: string;
}> = [
  { value: "active", label: "Active", hint: "Normal. Kartu bisa diklik." },
  {
    value: "new",
    label: "New",
    hint: "Sama seperti Active, tapi kartunya dapat badge NEW.",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    hint: "Link dimatikan. Kartu tetap tampil dengan tulisan sedang diperbaiki.",
  },
];

// Ordered so the broadest audience comes first - most apps only need one of
// the top two, and the specific roles are for the exceptions.
const ACCESS_GROUPS: Array<{
  value: AdminAccessSource;
  label: string;
  hint: string;
}> = [
  { value: "public", label: "Semua orang", hint: "Karyawan dan siswa" },
  { value: "employee", label: "Semua karyawan", hint: "Semua staf, bukan siswa" },
  { value: "student", label: "Siswa", hint: "" },
  { value: "teacher", label: "Guru", hint: "" },
  { value: "staff", label: "Staf", hint: "Karyawan non-guru" },
  { value: "principal", label: "Kepala Sekolah", hint: "" },
  { value: "head-unit", label: "Kepala Unit", hint: "" },
  { value: "director", label: "Direktur", hint: "" },
  { value: "admin", label: "Admin sistem", hint: "Terdaftar sebagai AdminUser" },
  { value: "resource", label: "Tim Resource", hint: "" },
  { value: "mad-labs", label: "MAD Labs", hint: "" },
];

const emptyForm: AdminApplicationInput = {
  name: "",
  icon: "AppWindow",
  description: "",
  audience: "",
  category: "",
  keywords: [],
  href: "",
  external: true,
  status: "active",
  discoverable: true,
  allowedSources: [],
  ssoAppId: "",
  ssoEntryUrl: "",
  ssoLogoutUrl: "",
  sortOrder: 0,
};

function formFromApplication(
  application?: AdminApplication | null,
): AdminApplicationInput {
  if (!application) return emptyForm;
  return {
    id: application.id,
    name: application.name,
    icon: application.icon,
    description: application.description,
    audience: application.audience,
    category: application.category,
    keywords: application.keywords,
    href: application.href ?? "",
    external: application.external,
    status: application.status.toLowerCase() as Lowercase<AdminApplicationStatus>,
    discoverable: application.discoverable,
    allowedSources: application.allowed_sources,
    ssoAppId: application.sso_app_id ?? "",
    ssoEntryUrl: application.sso_entry_url ?? "",
    ssoLogoutUrl: application.sso_logout_url ?? "",
    sortOrder: application.sort_order,
  };
}

// The id the backend would derive from a name, shown so nobody has to guess
// what it will be - it ends up in the launch URL.
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// The SSO entry point is always the app's address plus /auth/sso. Asking for
// the address and building the rest removes the single most confusing field
// in this form.
function ssoEntryFromBase(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, "");
  return trimmed ? `${trimmed}/auth/sso` : "";
}

// Same base as the entry point: an app that runs its own no-UI "clear my
// local session" page for Hub's logout fan-out exposes it at this fixed
// path, so there is nothing extra to ask for here either.
function ssoLogoutFromBase(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, "");
  return trimmed ? `${trimmed}/auth/logout-silent` : "";
}

function baseFromSsoEntry(entry: string): string {
  return entry.replace(/\/auth\/sso\/?$/, "");
}

const inputClass =
  "mt-1 w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const sectionClass = "rounded-lg border border-border/60 p-4 sm:p-5";

function SectionHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ApplicationForm({
  application,
  isSaving,
  onCancel,
  onSubmit,
}: ApplicationFormProps) {
  const [form, setForm] = useState<AdminApplicationInput>(() =>
    formFromApplication(application),
  );
  const [formError, setFormError] = useState("");
  const [iconQuery, setIconQuery] = useState("");
  const [usesSso, setUsesSso] = useState(Boolean(application?.sso_app_id));
  const [ssoBase, setSsoBase] = useState(
    baseFromSsoEntry(application?.sso_entry_url ?? ""),
  );

  useEffect(() => {
    setForm(formFromApplication(application));
    setUsesSso(Boolean(application?.sso_app_id));
    setSsoBase(baseFromSsoEntry(application?.sso_entry_url ?? ""));
    setFormError("");
  }, [application]);

  function update<K extends keyof AdminApplicationInput>(
    key: K,
    value: AdminApplicationInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSource(source: AdminAccessSource) {
    const current = form.allowedSources ?? [];
    update(
      "allowedSources",
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    );
  }

  const appId = application?.id || slugify(form.name);

  // Written from the access groups rather than typed separately. The two
  // fields always said the same thing, and keeping them in sync by hand is
  // how a card ends up claiming one audience while admitting another.
  const derivedAudience = useMemo(() => {
    const chosen = ACCESS_GROUPS.filter((group) =>
      form.allowedSources?.includes(group.value),
    );
    if (chosen.length === 0) return "";
    if (chosen.some((group) => group.value === "public")) return "Everyone";
    return chosen.map((group) => group.label).join(", ");
  }, [form.allowedSources]);

  const visibleIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    const entries = Object.entries(HUB_ICONS);
    if (!query) return entries;
    return entries.filter(([name]) => name.toLowerCase().includes(query));
  }, [iconQuery]);

  const PreviewIcon = getAppIcon(form.icon || "AppWindow");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError("Nama aplikasi wajib diisi.");
      return;
    }
    if (!form.category.trim()) {
      setFormError("Pilih satu kategori.");
      return;
    }
    if ((form.allowedSources ?? []).length === 0) {
      setFormError(
        "Pilih minimal satu kelompok pengguna. Tanpa ini aplikasi tidak akan terlihat oleh siapa pun.",
      );
      return;
    }
    if (form.status !== "maintenance" && !form.href?.trim()) {
      setFormError("Alamat aplikasi wajib diisi kecuali statusnya Maintenance.");
      return;
    }
    if (usesSso && !ssoBase.trim()) {
      setFormError("Isi alamat backend aplikasi, atau matikan login lewat Hub.");
      return;
    }

    setFormError("");
    await onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      // Sent from the derived value so the stored copy always matches the
      // access groups that actually decide.
      audience: derivedAudience,
      category: form.category.trim(),
      keywords: (form.keywords ?? [])
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      href: form.href?.trim() || null,
      ssoAppId: usesSso ? appId : null,
      ssoEntryUrl: usesSso ? ssoEntryFromBase(ssoBase) : null,
      ssoLogoutUrl: usesSso ? ssoLogoutFromBase(ssoBase) || null : null,
      sortOrder: Number(form.sortOrder) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      {/* Shows the result of the choices above it, so nobody has to save and
          go look at the hub to find out what they built. */}
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tampilan kartu di Hub
        </p>
        <div className="mt-3 flex items-start gap-3 rounded-md border border-border/70 bg-background p-3">
          <PreviewIcon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
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

      <section className={sectionClass}>
        <SectionHeading
          step={1}
          title="Identitas aplikasi"
          subtitle="Yang dilihat pengguna di halaman Hub."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Nama aplikasi
            <input
              className={inputClass}
              value={form.name}
              placeholder="Contoh: Report Assistant"
              onChange={(event) => update("name", event.target.value)}
            />
            {appId ? (
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Kode aplikasi dibuat otomatis:{" "}
                <code className="rounded bg-muted px-1">{appId}</code>
                {application ? " (tidak berubah saat diedit)" : ""}
              </span>
            ) : null}
          </label>

          <label className="text-sm font-medium">
            Kategori
            <span className="block text-xs font-normal text-muted-foreground">
              Menentukan aplikasi muncul di tab mana.
            </span>
            <select
              className={inputClass}
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            >
              <option value="">Pilih kategori</option>
              {HUB_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium sm:col-span-2">
            Deskripsi
            <span className="block text-xs font-normal text-muted-foreground">
              Satu kalimat, bahasa awam. Contoh: "Membuat slide rapor siswa."
            </span>
            <textarea
              className={inputClass}
              rows={2}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>

          <label className="text-sm font-medium sm:col-span-2">
            Kata kunci pencarian
            <span className="block text-xs font-normal text-muted-foreground">
              Opsional. Kata lain yang mungkin diketik orang saat mencari
              aplikasi ini, dipisah koma.
            </span>
            <input
              className={inputClass}
              placeholder="rapor, slide, siswa"
              value={(form.keywords ?? []).join(", ")}
              onChange={(event) =>
                update("keywords", event.target.value.split(","))
              }
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Ikon</legend>
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Cari ikon, misal: file, book, wrench"
              value={iconQuery}
              onChange={(event) => setIconQuery(event.target.value)}
            />
            <div className="mt-2 grid max-h-44 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8">
              {visibleIcons.map(([icon, Icon]) => (
                <button
                  key={icon}
                  type="button"
                  title={icon}
                  aria-label={`Gunakan ikon ${icon}`}
                  aria-pressed={form.icon === icon}
                  onClick={() => update("icon", icon)}
                  className={`flex h-14 flex-col items-center justify-center gap-1 rounded-md border text-[10px] transition-colors ${
                    form.icon === icon
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="max-w-full truncate px-1">{icon}</span>
                </button>
              ))}
              {visibleIcons.length === 0 ? (
                <p className="col-span-full py-3 text-xs text-muted-foreground">
                  Tidak ada ikon yang cocok.
                </p>
              ) : null}
            </div>
          </fieldset>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading
          step={2}
          title="Siapa yang boleh memakai"
          subtitle="Ini yang menentukan aplikasi terlihat oleh siapa. Wajib pilih minimal satu."
        />
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          {ACCESS_GROUPS.map((group) => (
            <label
              key={group.value}
              className="flex items-start gap-2 rounded-md border border-border/60 p-2"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={form.allowedSources?.includes(group.value) ?? false}
                onChange={() => toggleSource(group.value)}
              />
              <span>
                <span className="font-medium">{group.label}</span>
                {group.hint ? (
                  <span className="block text-xs text-muted-foreground">
                    {group.hint}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Teks "Terlihat oleh" pada kartu ditulis otomatis dari pilihan ini,
          jadi keduanya tidak akan pernah berbeda.
        </p>
      </section>

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
              onChange={(event) =>
                update("sortOrder", Number(event.target.value))
              }
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
              Alamat backend aplikasi
              <span className="block text-xs font-normal text-muted-foreground">
                Alamat server aplikasinya saja, tanpa path. Contoh:
                https://app.millenniaws.sch.id/mtss
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
                Kode SSO: <code className="rounded bg-muted px-1">{appId || "-"}</code>{" "}
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

      <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border/70 px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isSaving
            ? "Menyimpan..."
            : application
              ? "Simpan perubahan"
              : "Tambah aplikasi"}
        </button>
      </div>
    </form>
  );
}
