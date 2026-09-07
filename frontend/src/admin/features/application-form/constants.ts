import type { AdminApplicationInput, AdminApplicationStatus } from "@/admin/api/adminApi";

// Every status the form offers says what it does to the card, not what it is
// called in the database. "Maintenance" on its own tells nobody that the link
// stops working.
export const STATUSES: Array<{
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

export const emptyForm: AdminApplicationInput = {
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

export const inputClass =
  "mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";

export const sectionClass =
  "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm";

export const sectionBodyClass = "p-5 sm:p-6";

export const labelClass = "block text-sm font-medium text-slate-700";

export const helperTextClass = "mt-1 text-xs leading-5 text-slate-500";

export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";

export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
