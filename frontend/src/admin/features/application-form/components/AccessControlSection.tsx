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
        title="Access control"
        subtitle="Choose Central identities or rules. At least one access rule is required."
      />
      <div className={sectionBodyClass}>
        {accessGroups.length > 1 ? (
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] p-1 text-sm md:grid-cols-4" role="tablist" aria-label="Access rule groups">
            {accessGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={activeAccessGroup === group.key}
                onClick={() => {
                  setActiveAccessGroup(group.key);
                  setAccessQuery("");
                }}
                className={`admin-focus rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  activeAccessGroup === group.key
                    ? "bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm"
                    : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text)]"
                }`}
              >
                {group.title}
                <span className="ml-1 text-xs text-[var(--admin-text-tertiary)]">
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
                placeholder="Search name, ID, role, or permission"
                value={accessQuery}
                onChange={(event) => setAccessQuery(event.target.value)}
              />
              <span className="shrink-0 text-xs font-medium text-[var(--admin-text-tertiary)]">
                {filteredAccessOptions.length} options
              </span>
            </div>

            <div className="mt-3 grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-[var(--admin-border)] p-2 text-sm md:grid-cols-2">
              {filteredAccessOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors ${
                    allowedSources.includes(option.value)
                      ? "border-[var(--admin-brand)]/30 bg-[var(--admin-brand-soft)]"
                      : "border-transparent hover:bg-[var(--admin-card-subtle)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[var(--admin-border-strong)] text-[var(--admin-brand)] focus:ring-[var(--admin-brand)]"
                    checked={allowedSources.includes(option.value)}
                    onChange={() => toggleSource(option.value)}
                  />
                  <span className="min-w-0">
                    <span className="admin-heading block truncate font-bold text-[var(--admin-text)]">
                      {option.label}
                    </span>
                    <span className="block break-all text-xs text-[var(--admin-text-tertiary)]">
                      {option.value}
                    </span>
                  </span>
                </label>
              ))}
              {filteredAccessOptions.length === 0 ? (
                <p className="col-span-full rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-card-subtle)] p-4 text-center text-xs text-[var(--admin-text-tertiary)]">
                  No matching options.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--admin-gold)]/30 bg-[var(--admin-gold-soft)] p-3 text-xs text-[var(--admin-gold-text)]">
            Central access options are currently unavailable.
          </p>
        )}

        <div className="mt-5 border-t border-[var(--admin-border)] pt-5">
          <label className={labelClass}>
            Add a Central rule
            <span className={helperTextClass}>
              Use a Central ID or claim rather than maintaining a separate Hub list.
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
              Add
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-[var(--admin-text-tertiary)] md:grid-cols-2">
            {centralRulePrefixes.map((prefix) => (
              <p key={prefix.value} className="min-w-0 break-words">
                <code className="rounded bg-[var(--admin-card-subtle)] px-1 text-[var(--admin-text-secondary)]">
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
                className="admin-focus max-w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-card)] hover:text-[var(--admin-text)]"
                aria-label={`Remove access rule ${source.label}`}
              >
                <span className="inline-block max-w-56 truncate align-bottom">
                  {source.label}
                </span>{" "}
                ×
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
