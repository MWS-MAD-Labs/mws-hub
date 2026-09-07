import type { AdminApplicationInput } from "@/admin/api/adminApi";
import { HUB_CATEGORIES } from "@/data/hubCategories";
import { inputClass, sectionClass } from "../constants";
import { normalizeKeywordParts } from "../utils/keywords";
import type { IconComponent, IconEntry } from "../types";
import SectionHeading from "./SectionHeading";

type IdentitySectionProps = {
  form: AdminApplicationInput;
  update: <K extends keyof AdminApplicationInput>(
    key: K,
    value: AdminApplicationInput[K],
  ) => void;
  appId: string;
  isEditing: boolean;
  keywordText: string;
  iconQuery: string;
  setIconQuery: (value: string) => void;
  visibleIcons: IconEntry[];
  PreviewIcon: IconComponent;
};

// Step 1: name, category, description, keywords, and the icon picker - the
// stuff that's directly visible to whoever ends up on the Hub page.
export default function IdentitySection({
  form,
  update,
  appId,
  isEditing,
  keywordText,
  iconQuery,
  setIconQuery,
  visibleIcons,
  PreviewIcon,
}: IdentitySectionProps) {
  return (
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
              {isEditing ? " (tidak berubah saat diedit)" : ""}
            </span>
          ) : null}
        </label>

        <label className="text-sm font-medium">
          Kategori
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
            value={keywordText}
            onChange={(event) =>
              update("keywords", normalizeKeywordParts(event.target.value))
            }
          />
        </label>

        <fieldset className="sm:col-span-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 sm:w-52">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-primary">
                <PreviewIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <legend className="text-sm font-medium">Ikon</legend>
                <p className="truncate text-xs text-muted-foreground">
                  {form.icon || "AppWindow"}
                </p>
              </div>
            </div>
            <input
              className={`${inputClass} mt-0`}
              placeholder="Cari ikon, misal: file, book, wrench"
              value={iconQuery}
              onChange={(event) => setIconQuery(event.target.value)}
            />
          </div>
          <div className="mt-3 grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto rounded-lg border border-border/60 bg-background p-2 sm:grid-cols-10 lg:grid-cols-12">
            {visibleIcons.map(([icon, Icon]) => (
              <button
                key={icon}
                type="button"
                title={icon}
                aria-label={`Gunakan ikon ${icon}`}
                aria-pressed={form.icon === icon}
                onClick={() => update("icon", icon)}
                className={`flex aspect-square min-h-10 items-center justify-center rounded-md border transition-colors ${
                  form.icon === icon
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
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
  );
}
