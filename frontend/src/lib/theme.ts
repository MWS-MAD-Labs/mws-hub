export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
export const THEME_SPELL_EVENT = "mws:theme-spell";

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // ignore storage access errors
  }
  return getSystemTheme();
};

export const persistTheme = (theme: Theme): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore persistence errors
  }
};

export const applyThemePreference = (theme: Theme): void => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const next: Theme = theme === "dark" ? "dark" : "light";
  root.classList.toggle("dark", next === "dark");
  root.dataset.theme = next;
  root.style.setProperty("color-scheme", next === "dark" ? "dark" : "light");
};

export const getThemeIncantation = (theme: Theme): string => (theme === "dark" ? "Nox" : "Lumos Maxima");

type ThemeSpellOptions = {
  theme: Theme;
  x?: number | null;
  y?: number | null;
  trigger?: string;
};

export const emitThemeSpell = ({ theme, x = null, y = null, trigger = "user" }: ThemeSpellOptions): void => {
  if (typeof window === "undefined") return;
  const next: Theme = theme === "dark" ? "dark" : "light";
  const detail = {
    theme: next,
    incantation: getThemeIncantation(next),
    x: typeof x === "number" ? x : null,
    y: typeof y === "number" ? y : null,
    trigger,
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(THEME_SPELL_EVENT, { detail }));
};

export const syncInitialTheme = (): Theme => {
  const initial = getStoredTheme();
  applyThemePreference(initial);
  return initial;
};
