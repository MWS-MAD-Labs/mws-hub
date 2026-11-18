import { CheckCircle2, CircleAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Tone } from "@/admin/components/ui/styles";

export type Level = "ok" | "warning" | "problem";

export const LEVEL: Record<Level, { label: string; tone: Tone; icon: LucideIcon }> = {
  ok: { label: "Healthy", tone: "success", icon: CheckCircle2 },
  warning: { label: "Needs a look", tone: "warning", icon: TriangleAlert },
  problem: { label: "Problem", tone: "danger", icon: CircleAlert },
};

export const FAILURE_LABEL: Record<string, string> = {
  entitlement_denied: "No access",
  maintenance: "Under maintenance",
  coming_soon: "Not released",
  no_link: "No link",
  unknown_app: "No longer available",
  central_unavailable: "Central did not answer",
  account_inactive: "Account inactive",
};

export const dateTime = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
