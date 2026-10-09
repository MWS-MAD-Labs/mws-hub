import type { AdminApplicationInput } from "@/admin/api/adminApi";
import Dropdown from "@/admin/components/ui/Dropdown";
import AdminFieldLabel from "@/admin/components/ui/AdminFieldLabel";
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
        title="Application Identity"
        subtitle="Yang dilihat pengguna di halaman Hub."
      />
      <div className={`${sectionBodyClass} grid gap-5 md:grid-cols-2`}>
        <label className={labelClass}>
          Application Name
          <input
            className={inputClass}
            value={form.name}
            placeholder="Example: Report Assistant"
            onChange={(event) => update("name", event.target.value)}
          />
          {appId ? (
            <span className={helperTextClass}>
              Application ID is generated automatically:{" "}
              <code className="rounded bg-[var(--admin-card-subtle)] px-1 text-[var(--admin-text-secondary)]">
                {appId}
              </code>
              {isEditing ? " (fixed while editing)" : ""}
            </span>
          ) : null}
        </label>

        <label className={labelClass}>
          Category
          <Dropdown
            value={form.category}
            placeholder="Select category"
            buttonClassName="mt-1.5 h-[42px] text-left"
            options={[
              { value: "", label: "Select category" },
              ...HUB_CATEGORIES.map((category) => ({
                value: category.id,
                label: category.label,
              })),
            ]}
            onChange={(value) => update("category", value)}
          />
        </label>

        <label className={`${labelClass} md:col-span-2`}>
          Description
          <textarea
            className={`${inputClass} min-h-24 resize-none`}
            rows={2}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Example: Helps teachers prepare student reports."
          />
        </label>

        <label className="flex flex-col">
          <AdminFieldLabel optional>Search Keywords</AdminFieldLabel>
          <input
            className={inputClass}
            placeholder="reports, slides, students"
            value={keywordText}
            onChange={(event) =>
              update("keywords", normalizeKeywordParts(event.target.value))
            }
          />
        </label>

        <div className="flex flex-col">
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
