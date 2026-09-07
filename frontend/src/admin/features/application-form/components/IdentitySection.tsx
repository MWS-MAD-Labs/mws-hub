import type { AdminApplicationInput } from "@/admin/api/adminApi";
import Dropdown from "@/admin/components/ui/Dropdown";
import { HUB_CATEGORIES } from "@/data/hubCategories";
import {
  helperTextClass,
  inputClass,
  labelClass,
  sectionBodyClass,
  sectionClass,
} from "../constants";
import { normalizeKeywordParts } from "../utils/keywords";
import type { IconComponent, IconEntry } from "../types";
import SectionHeading from "./SectionHeading";
import IconPicker from "./IconPicker";

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
      <div className={`${sectionBodyClass} grid gap-5 md:grid-cols-2`}>
        <label className={labelClass}>
          Nama aplikasi
          <input
            className={inputClass}
            value={form.name}
            placeholder="Contoh: Report Assistant"
            onChange={(event) => update("name", event.target.value)}
          />
          {appId ? (
            <span className={helperTextClass}>
              Kode aplikasi dibuat otomatis:{" "}
              <code className="rounded bg-slate-100 px-1 text-slate-700">
                {appId}
              </code>
              {isEditing ? " (tidak berubah saat diedit)" : ""}
            </span>
          ) : null}
        </label>

        <label className={labelClass}>
          Kategori
          <Dropdown
            value={form.category}
            placeholder="Pilih kategori"
            buttonClassName={`${inputClass} h-[42px] py-0 text-left`}
            options={[
              { value: "", label: "Pilih kategori" },
              ...HUB_CATEGORIES.map((category) => ({
                value: category.id,
                label: category.label,
              })),
            ]}
            onChange={(value) => update("category", value)}
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          Deskripsi
          <textarea
            className={`${inputClass} min-h-24 resize-none`}
            rows={2}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Contoh: Membantu guru membuat laporan siswa dengan cepat."
          />
        </label>

        <label className={labelClass}>
          Kata kunci pencarian{" "}
          <span className="text-xs text-slate-500">(Opsional)</span>
          <input
            className={inputClass}
            placeholder="rapor, slide, siswa"
            value={keywordText}
            onChange={(event) =>
              update("keywords", normalizeKeywordParts(event.target.value))
            }
          />
        </label>

        <div>
          <IconPicker
            value={form.icon}
            query={iconQuery}
            setQuery={setIconQuery}
            icons={visibleIcons}
            onChange={(icon) => update("icon", icon)}
            PreviewIcon={PreviewIcon}
          />
        </div>
      </div>
    </section>
  );
}
