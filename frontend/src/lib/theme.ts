export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
export const THEME_SPELL_EVENT = "mws:theme-spell";

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
  return "light";
};

export const persistTheme = (theme: Theme): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore persistence errors
  }
};

// The browser/OS status bar takes its color from <meta name="theme-color">.
// Keep it equal to the page background (the header's color) for the active
// theme, so the status bar and header read as one surface.
const STATUS_BAR_FALLBACK: Record<Theme, string> = {
  light: "#f9f7f6",
  dark: "#0e121b",
};

const syncStatusBarColor = (theme: Theme): void => {
  let color = STATUS_BAR_FALLBACK[theme];
  try {
    const background = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
    // A canvas turns any CSS color (hsl, oklch, ...) into #rrggbb, which every browser accepts here.
    const context = background ? document.createElement("canvas").getContext("2d") : null;
    if (context) {
      context.fillStyle = color;
      context.fillStyle = background;
      color = String(context.fillStyle);
    }
  } catch {
    // keep the fallback
  }

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
};

export const applyThemePreference = (theme: Theme): void => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const next: Theme = theme === "dark" ? "dark" : "light";
  root.classList.toggle("dark", next === "dark");
  root.dataset.theme = next;
  root.style.setProperty("color-scheme", next === "dark" ? "dark" : "light");
  syncStatusBarColor(next);
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
