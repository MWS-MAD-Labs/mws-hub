export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "mws:theme-change";
export const THEME_SPELL_EVENT = "mws:theme-spell";

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getStoredTheme = (): ThemePreference => {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === "system" ? getSystemTheme() : preference;

export const applyThemePreference = (preference: ThemePreference): ResolvedTheme => {
  const resolved = resolveTheme(preference);
  if (typeof document === "undefined") return resolved;

  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  themeColor?.setAttribute("content", resolved === "dark" ? "#171112" : "#FFFAF4");
  return resolved;
};

export const persistTheme = (preference: ThemePreference): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme persistence is a convenience; applying it in this tab still works.
  }
};

export const setThemePreference = (preference: ThemePreference): ResolvedTheme => {
  persistTheme(preference);
  const resolved = applyThemePreference(preference);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  return resolved;
};

export const subscribeToTheme = (listener: () => void): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyThemePreference(getStoredTheme());
    listener();
  };
  const handleSystemChange = () => {
    if (getStoredTheme() !== "system") return;
    applyThemePreference("system");
    listener();
  };

  window.addEventListener(THEME_CHANGE_EVENT, listener);
  window.addEventListener("storage", handleStorage);
  media.addEventListener("change", handleSystemChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
    media.removeEventListener("change", handleSystemChange);
  };
};

export const emitThemeSpell = (theme: ResolvedTheme, x?: number, y?: number): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THEME_SPELL_EVENT, {
    detail: { theme, x: x ?? null, y: y ?? null, trigger: "theme-toggle", timestamp: Date.now() },
  }));
};

export const syncInitialTheme = (): ThemePreference => {
  const preference = getStoredTheme();
  applyThemePreference(preference);
  return preference;
};
