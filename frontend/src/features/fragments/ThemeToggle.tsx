import { useState, useEffect, useRef, useCallback, type MouseEvent } from "react";
import { motion } from "framer-motion";
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
        aria-label="Toggle theme"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[0.25rem] border border-border bg-card text-foreground transition-colors hover:bg-muted"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-yellow-500" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-500" />
        )}
      </button>
    );
  }

  return (
    <motion.div
      initial={lowMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: lowMotion ? 0.12 : 0.4, ease: "easeOut" }}
      className="relative"
    >
      {/* blob background */}
      <motion.div
        className="absolute -inset-6 -z-10 rounded-full bg-primary/25 blur-2xl"
        animate={lowMotion ? { opacity: 0.35 } : { scale: [1, 1.15, 1], opacity: [0.6, 0.4, 0.6] }}
        transition={lowMotion ? {} : { repeat: Infinity, duration: 6, ease: "easeInOut" }}
      />

      {/* toggle button */}
      <motion.button
        onClick={handleToggleTheme}
        whileTap={lowMotion ? {} : { scale: 0.9 }}
        whileHover={lowMotion ? {} : { scale: 1.05 }}
        transition={lowMotion ? { duration: 0.12 } : { type: "spring", stiffness: 280, damping: 18 }}
        aria-label="Toggle theme"
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/60 text-foreground shadow-lg backdrop-blur-xl"
      >
        {theme === "dark" ? (
          <Sun className="h-6 w-6 text-yellow-400" />
        ) : (
          <Moon className="h-6 w-6 text-indigo-400" />
        )}
      </motion.button>
    </motion.div>
  );
}
