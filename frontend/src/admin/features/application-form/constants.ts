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
    hint: "The card stays visible but cannot be opened while work is in progress.",
  },
  {
    value: "coming_soon",
    label: "Coming soon",
    hint: "The card is visible as an upcoming application and cannot be opened yet.",
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
  centralEntitlementAppId: "",
  sortOrder: 0,
};

export const inputClass =
  "admin-focus mt-1.5 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-3.5 py-2.5 text-sm text-[var(--admin-text)] outline-none transition placeholder:text-[var(--admin-text-tertiary)]";

export const sectionClass =
  "overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)]";

export const sectionBodyClass = "p-5 sm:p-6";

export const labelClass = "admin-heading block text-sm font-bold text-[var(--admin-text)]";

export const helperTextClass = "mt-1 block text-xs leading-5 text-[var(--admin-text-tertiary)]";

export const secondaryButtonClass =
  "admin-focus admin-heading inline-flex h-10 items-center justify-center rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-4 text-sm font-bold text-[var(--admin-text)] transition hover:bg-[var(--admin-card-subtle)] disabled:opacity-60";

export const primaryButtonClass =
  "admin-focus admin-heading inline-flex h-10 items-center justify-center rounded-full bg-[var(--admin-brand)] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#241718]";
