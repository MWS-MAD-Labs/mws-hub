import type { AdminAccessSource } from "@/admin/api/adminApi";
import type { AccessGroup, AccessOption } from "../types";
import {
  helperTextClass,
  inputClass,
  labelClass,
  secondaryButtonClass,
  sectionBodyClass,
  sectionClass,
} from "../constants";
import SectionHeading from "./SectionHeading";

type CentralRulePrefix = { value: string; hint: string };

type AccessControlSectionProps = {
  accessGroups: AccessGroup[];
  activeAccessGroup: string;
  setActiveAccessGroup: (key: string) => void;
  accessQuery: string;
  setAccessQuery: (value: string) => void;
  filteredAccessOptions: AccessOption[];
  selectedAccessLabels: Array<{ value: string; label: string }>;
  allowedSources: string[];
  toggleSource: (source: AdminAccessSource) => void;
  removeSource: (source: AdminAccessSource) => void;
  customRule: string;
  setCustomRule: (value: string) => void;
  addCustomRule: () => void;
  centralRulePrefixes: CentralRulePrefix[];
};

export default function AccessControlSection({
  accessGroups,
  activeAccessGroup,
  setActiveAccessGroup,
  accessQuery,
  setAccessQuery,
  filteredAccessOptions,
  selectedAccessLabels,
  allowedSources,
  toggleSource,
  removeSource,
  customRule,
  setCustomRule,
  addCustomRule,
  centralRulePrefixes,
}: AccessControlSectionProps) {
  return (
    <section className={sectionClass}>
      <SectionHeading
        step={2}
        title="Siapa yang boleh memakai"
        subtitle="Pakai identity dan ID master data dari Central. Wajib pilih minimal satu."
      />
      <div className={sectionBodyClass}>
        {accessGroups.length > 1 ? (
          <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 text-sm md:grid-cols-4">
            {accessGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => {
                  setActiveAccessGroup(group.key);
                  setAccessQuery("");
                }}
                className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                  activeAccessGroup === group.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {group.title}
                <span className="ml-1 text-xs text-slate-400">
                  {group.options.length}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {accessGroups.length > 0 ? (
          <div className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className={`${inputClass} mt-0`}
                placeholder="Cari nama, ID, role, atau permission"
                value={accessQuery}
                onChange={(event) => setAccessQuery(event.target.value)}
              />
              <span className="shrink-0 text-xs font-medium text-slate-500">
                {filteredAccessOptions.length} pilihan
              </span>
            </div>

            <div className="mt-3 grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-slate-200 p-2 text-sm md:grid-cols-2">
              {filteredAccessOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors ${
                    allowedSources.includes(option.value)
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                    checked={allowedSources.includes(option.value)}
                    onChange={() => toggleSource(option.value)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">
                      {option.label}
                    </span>
                    <span className="block break-all text-xs text-slate-500">
                      {option.value}
                    </span>
                  </span>
                </label>
              ))}
              {filteredAccessOptions.length === 0 ? (
                <p className="col-span-full rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  Tidak ada pilihan yang cocok.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            Data Unit/Job dari Central belum tersedia. Cek CENTRAL_API_TOKEN dan
            endpoint /api/internal/employees.
          </p>
        )}

        <div className="mt-5 border-t border-slate-200 pt-5">
          <label className={labelClass}>
            Tambah rule dari Central
            <span className={helperTextClass}>
              Gunakan ID atau claim yang berasal dari Central, bukan daftar
              manual di Hub.
            </span>
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              className={`${inputClass} mt-0`}
              placeholder="unit:cmsh7trcj000a40lsm0w7tl4h"
              value={customRule}
              onChange={(event) => setCustomRule(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomRule();
                }
              }}
            />
            <button
              type="button"
              onClick={addCustomRule}
              className={`${secondaryButtonClass} sm:w-auto`}
            >
              Tambah
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
            {centralRulePrefixes.map((prefix) => (
              <p key={prefix.value} className="min-w-0 break-words">
                <code className="rounded bg-slate-100 px-1 text-slate-700">
                  {prefix.value}
                </code>{" "}
                {prefix.hint}
              </p>
            ))}
          </div>
        </div>

        {selectedAccessLabels.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedAccessLabels.map((source) => (
              <button
                key={source.value}
                type="button"
                onClick={() => removeSource(source.value)}
                className="max-w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                title="Klik untuk hapus rule"
              >
                <span className="inline-block max-w-56 truncate align-bottom">
                  {source.label}
                </span>{" "}
                x
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
