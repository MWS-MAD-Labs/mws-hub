import { useEffect, useMemo, useState } from "react";
import type { AdminAccessOptions, AdminAccessSource } from "@/admin/api/adminApi";
import type { AccessGroup } from "../types";

type UseAccessControlArgs = {
  accessOptions: AdminAccessOptions;
  allowedSources: string[];
  onChange: (sources: string[]) => void;
  /** Change this (e.g. pass the `application` being edited) to reset the
   *  picker's own UI state - search text and active tab - when the form
   *  switches to a different application. */
  resetKey?: unknown;
};

// Owns everything about "who can use this app": the tabbed group picker,
// the search box inside it, free-form custom rules, and the audience label
// derived from whatever is currently selected.
export function useAccessControl({
  accessOptions,
  allowedSources,
  onChange,
  resetKey,
}: UseAccessControlArgs) {
  const [accessQuery, setAccessQuery] = useState("");
  const [activeAccessGroup, setActiveAccessGroup] = useState("base");
  const [customRule, setCustomRule] = useState("");

  useEffect(() => {
    setAccessQuery("");
    setActiveAccessGroup("base");
  }, [resetKey]);

  const accessGroups = useMemo<AccessGroup[]>(
    () =>
      [
        { key: "base", title: "Umum", options: accessOptions.base },
        { key: "units", title: "Unit", options: accessOptions.central.units },
        {
          key: "jobPositions",
          title: "Jabatan",
          options: accessOptions.central.jobPositions,
        },
        {
          key: "jobLevels",
          title: "Level",
          options: accessOptions.central.jobLevels,
        },
      ].filter((group) => group.options.length > 0),
    [accessOptions],
  );

  const activeAccessOptions = useMemo(
    () =>
      accessGroups.find((group) => group.key === activeAccessGroup)?.options ??
      accessGroups[0]?.options ??
      [],
    [accessGroups, activeAccessGroup],
  );

  const filteredAccessOptions = useMemo(() => {
    const query = accessQuery.trim().toLowerCase();
    if (!query) return activeAccessOptions;
    return activeAccessOptions.filter((option) =>
      `${option.label} ${option.value} ${option.hint}`.toLowerCase().includes(query),
    );
  }, [activeAccessOptions, accessQuery]);

  // Written from the access groups rather than typed separately. The two
  // fields always said the same thing, and keeping them in sync by hand is
  // how a card ends up claiming one audience while admitting another.
  const derivedAudience = useMemo(() => {
    const allOptions = [
      ...accessOptions.base,
      ...accessOptions.central.units,
      ...accessOptions.central.jobPositions,
      ...accessOptions.central.jobLevels,
    ];
    const chosen = allOptions.filter((group) => allowedSources.includes(group.value));
    if (chosen.some((group) => group.value === "public")) return "Everyone";
    const knownLabels = chosen.map((group) => group.label);
    const customLabels = allowedSources.filter(
      (source) => !allOptions.some((group) => group.value === source),
    );
    return [...knownLabels, ...customLabels].join(", ");
  }, [accessOptions, allowedSources]);

  const selectedAccessLabels = useMemo(
    () =>
      allowedSources.map((source) => {
        const option = accessGroups
          .flatMap((group) => group.options)
          .find((item) => item.value === source);
        return { value: source, label: option?.label ?? source };
      }),
    [accessGroups, allowedSources],
  );

  function toggleSource(source: AdminAccessSource) {
    onChange(
      allowedSources.includes(source)
        ? allowedSources.filter((item) => item !== source)
        : [...allowedSources, source],
    );
  }

  function removeSource(source: AdminAccessSource) {
    onChange(allowedSources.filter((item) => item !== source));
  }

  function addCustomRule() {
    const rule = customRule.trim();
    if (!rule) return;
    if (!allowedSources.includes(rule)) {
      onChange([...allowedSources, rule]);
    }
    setCustomRule("");
  }

  return {
    accessQuery,
    setAccessQuery,
    activeAccessGroup,
    setActiveAccessGroup,
    customRule,
    setCustomRule,
    accessGroups,
    filteredAccessOptions,
    selectedAccessLabels,
    derivedAudience,
    toggleSource,
    removeSource,
    addCustomRule,
  };
}
