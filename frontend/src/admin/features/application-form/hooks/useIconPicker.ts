import { useMemo, useState } from "react";
import { HUB_ICONS } from "@/data/hubCategories";
import type { IconEntry } from "../types";

export function useIconPicker() {
  const [iconQuery, setIconQuery] = useState("");

  const visibleIcons = useMemo<IconEntry[]>(() => {
    const query = iconQuery.trim().toLowerCase();
    const entries = Object.entries(HUB_ICONS).sort(([left], [right]) =>
      left.localeCompare(right),
    ) as IconEntry[];
    if (!query) return entries;
    return entries.filter(([name]) => name.toLowerCase().includes(query));
  }, [iconQuery]);

  return { iconQuery, setIconQuery, visibleIcons };
}
