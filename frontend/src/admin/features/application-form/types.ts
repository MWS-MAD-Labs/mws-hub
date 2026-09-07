import type { ComponentType } from "react";
import type { AdminAccessOptions } from "@/admin/api/adminApi";

// A single selectable "who can use this app" entry, e.g. one unit, one job
// position, or the built-in "public" option. Shape comes straight from
// AdminAccessOptions so this never drifts from what the API actually returns.
export type AccessOption = AdminAccessOptions["base"][number];

// One tab in the access picker (Umum / Unit / Jabatan / Level), only shown
// when it actually has options to offer.
export type AccessGroup = {
  key: string;
  title: string;
  options: AccessOption[];
};

export type IconComponent = ComponentType<{ className?: string }>;
export type IconEntry = [name: string, Icon: IconComponent];
