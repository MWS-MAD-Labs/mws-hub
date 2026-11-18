export const ACTION_LABELS: Record<string, string> = {
  "application.create": "Create app",
  "application.update": "Update app",
  "application.delete": "Delete app",
  "app_report.update_status": "Update report",
  "access_request.update_status": "Update access",
  "application.launch": "Launch app",
  "auth.login": "Sign in",
  "auth.logout": "Sign out",
  "hub.login_denied": "Login denied",
  "gpt_code.fetch": "Fetch GPT code",
  "gpt_code.mapping_update": "Update GPT mapping",
  "gpt_code.mapping_delete": "Delete GPT mapping",
  "gpt_code.exception_update": "Update GPT exception",
  "gpt_code.exception_delete": "Delete GPT exception",
};

// The action filter leaves out actions no longer recorded.
export const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  ...Object.entries(ACTION_LABELS)
    .filter(([key]) => key !== "access_request.update_status")
    .map(([value, label]) => ({ value, label })),
];

export const actionLabel = (action: string) => ACTION_LABELS[action] || action;

export const formatAuditDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export type RangePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

export const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
};

export const minDate = (left: string, right: string) => (left < right ? left : right);

export function rangeFor(preset: RangePreset) {
  const now = new Date();
  const today = toDateOnly(now);
  if (preset === "today") return { from: today, to: today };
  if (preset === "this_month") return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (preset === "last_month") return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 0)) };
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)), to: today };
}
