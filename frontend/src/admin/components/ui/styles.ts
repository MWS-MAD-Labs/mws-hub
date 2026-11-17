// Class names shared by the admin UI kit, for elements that are not the kit's
// own components (links styled as buttons, radix triggers, plain inputs).
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[var(--admin-brand)] text-white hover:opacity-90 dark:text-[#241718]",
  outline: "border border-[var(--admin-border-strong)] bg-[var(--admin-card)] text-[var(--admin-text)] hover:bg-[var(--admin-card-subtle)]",
  ghost: "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-card-subtle)] hover:text-[var(--admin-text)]",
  danger: "border border-[var(--admin-rose)]/40 bg-transparent text-[var(--admin-rose)] hover:bg-[var(--admin-rose-soft)]",
};

// Classes alone, for links or radix triggers that must look like a button.
export function buttonClass({ variant = "outline", size = "md", iconOnly = false, fullWidth = false }: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; fullWidth?: boolean } = {}) {
  return cn(
    "admin-focus inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none [&>svg]:shrink-0",
    VARIANT[variant],
    iconOnly ? (size === "sm" ? "h-8 w-8" : "h-9 w-9") : size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-[13px]",
    fullWidth && "w-full",
  );
}

export const fieldClass =
  "admin-focus h-9 w-full rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-3 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-tertiary)] disabled:cursor-not-allowed disabled:opacity-60";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const TONE_CLASS: Record<Tone, string> = {
  success: "bg-[var(--admin-sage-soft)] text-[var(--admin-sage-text)] ring-[var(--admin-sage)]/30",
  warning: "bg-[var(--admin-gold-soft)] text-[var(--admin-gold-text)] ring-[var(--admin-gold)]/35",
  danger: "bg-[var(--admin-rose-soft)] text-[var(--admin-rose)] ring-[var(--admin-rose)]/30",
  info: "bg-[var(--admin-navy-soft)] text-[var(--admin-navy)] ring-[var(--admin-navy)]/20",
  neutral: "bg-[var(--admin-card-subtle)] text-[var(--admin-text-tertiary)] ring-[var(--admin-border-strong)]",
};

