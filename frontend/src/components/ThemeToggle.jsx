// ThemeToggle.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import usePreferLowMotion from "@/hooks/usePreferLowMotion";
import { Sun, Moon } from "lucide-react";
import { applyThemePreference, emitThemeSpell, getStoredTheme, persistTheme } from "@/lib/theme";

export default function ThemeToggle() {
    const lowMotion = usePreferLowMotion();
    const [theme, setTheme] = useState(() => (typeof window === "undefined" ? "light" : getStoredTheme()));
    const isFirstSyncRef = useRef(true);
    const pendingSpellRef = useRef(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = getStoredTheme();
        if (stored !== theme) {
            setTheme(stored);
        }
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
            trigger: "theme-toggle"
        });
        pendingSpellRef.current = null;
    }, [theme]);

    const handleToggleTheme = useCallback(
        (event) => {
            const nextTheme = theme === "dark" ? "light" : "dark";
            const rect = event?.currentTarget?.getBoundingClientRect?.();
            pendingSpellRef.current = rect
                ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
                : null;

            const withViewTransition = !lowMotion && typeof document !== "undefined" && typeof document.startViewTransition === "function";
            if (withViewTransition) {
                document.startViewTransition(() => {
                    setTheme(nextTheme);
                });
                return;
            }

            setTheme(nextTheme);
        },
        [lowMotion, theme]
    );

    return (
        <motion.div
            initial={lowMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={lowMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: lowMotion ? 0.12 : 0.4, ease: "easeOut" }}
            className="relative"
        >
            {/* blob background */}
            <motion.div
                className="absolute -inset-6 rounded-full bg-primary/25 blur-2xl -z-10"
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
                className="
          relative flex items-center justify-center
          h-12 w-12 rounded-full
          border border-border
          bg-card/60 backdrop-blur-xl
          shadow-lg
          text-foreground
        "
            >
                {/* subtle glass grid */}
                <div className="absolute inset-0 rounded-full bg-grid-small/[0.08] dark:bg-grid-small-dark/[0.12] pointer-events-none" />

                {/* icon */}
                {theme === "dark" ? (
                    <Sun className="h-6 w-6 text-yellow-400" />
                ) : (
                    <Moon className="h-6 w-6 text-indigo-400" />
                )}
            </motion.button>
        </motion.div>
    );
}
