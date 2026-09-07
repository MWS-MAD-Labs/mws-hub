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
  "mt-1 w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export const sectionClass =
  "rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5";
