import { useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import usePreferLowMotion from "@/hooks/usePreferLowMotion";
import { cn } from "@/lib/utils";
import {
  emitThemeSpell,
  getStoredTheme,
  resolveTheme,
  setThemePreference,
  subscribeToTheme,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

type ThemeToggleProps = {
  variant?: "segmented" | "compact" | "admin";
};

export default function ThemeToggle({ variant = "segmented" }: ThemeToggleProps) {
  const lowMotion = usePreferLowMotion();
  const preference = useSyncExternalStore<ThemePreference>(subscribeToTheme, getStoredTheme, () => "system");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectTheme = (next: ThemePreference, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const apply = () => {
      const resolved = setThemePreference(next);
      emitThemeSpell(resolved, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };

    if (!lowMotion && typeof document.startViewTransition === "function") {
      document.startViewTransition(apply);
    } else {
      apply();
    }
    setOpen(false);
  };

  if (variant === "segmented") {
    return (
      <div className="flex items-center rounded-full border border-border bg-card p-1" role="radiogroup" aria-label="Color theme">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            aria-label={`${label} theme`}
            title={label}
            onClick={(event) => selectTheme(value, event)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              preference === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    );
  }

  const current = OPTIONS.find((option) => option.value === preference) || OPTIONS[2];
  const CurrentIcon = current.icon;
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Theme: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "grid place-items-center border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variant === "admin" ? "h-8 w-8 rounded" : "h-9 w-9 rounded-full",
        )}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close theme menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-36 rounded-xl border border-border bg-card p-1.5 shadow-xl" role="menu">
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" role="menuitemradio" aria-checked={preference === value} onClick={(event) => selectTheme(value, event)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                {preference === value ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
              </button>
            ))}
            <p className="px-2.5 pb-1 pt-1 text-[9px] text-muted-foreground">Currently {resolveTheme(preference)}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
