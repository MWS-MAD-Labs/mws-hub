import { useState, useEffect, useRef, useCallback, type MouseEvent } from "react";
import usePreferLowMotion from "@/hooks/usePreferLowMotion";
import { Sun, Moon } from "lucide-react";
import { applyThemePreference, emitThemeSpell, getStoredTheme, persistTheme, type Theme } from "@/lib/theme";

type PendingSpell = { x: number; y: number } | null;

type ThemeToggleProps = {
  variant?: "default" | "admin";
};

export default function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const lowMotion = usePreferLowMotion();
  const [theme, setTheme] = useState<Theme>(() => (typeof window === "undefined" ? "light" : getStoredTheme()));
  const isFirstSyncRef = useRef(true);
  const pendingSpellRef = useRef<PendingSpell>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = getStoredTheme();
    if (stored !== theme) {
      setTheme(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyThemePreference(theme);
    persistTheme(theme);

    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }

    const pendingSpell = pendingSpellRef.current;
    if (!pendingSpell) return;
    emitThemeSpell({
      theme,
      x: pendingSpell.x,
      y: pendingSpell.y,
      trigger: "theme-toggle",
    });
    pendingSpellRef.current = null;
  }, [theme]);

  const handleToggleTheme = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nextTheme: Theme = theme === "dark" ? "light" : "dark";
      const rect = event.currentTarget.getBoundingClientRect();
      pendingSpellRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

      const withViewTransition =
        !lowMotion && typeof document !== "undefined" && typeof document.startViewTransition === "function";
      if (withViewTransition) {
        document.startViewTransition(() => {
          setTheme(nextTheme);
        });
        return;
      }

      setTheme(nextTheme);
    },
    [lowMotion, theme],
  );

  if (variant === "admin") {
    return (
      <button
        type="button"
        onClick={handleToggleTheme}
        aria-label={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
        title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
        className="admin-focus inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)] transition-colors hover:bg-[var(--admin-card-subtle)]"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    );
  }

  // The mobile bottom bar: a plain button that stays in line with the other icons. No entrance or
  // hover motion: on Android an unfinished entrance left it sitting lower than the rest of the bar.
  return (
    <button
      type="button"
      onClick={handleToggleTheme}
      aria-label={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-400" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
      )}
    </button>
  );
}
