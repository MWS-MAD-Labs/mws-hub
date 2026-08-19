const THEME_STORAGE_KEY = "theme";
export const THEME_SPELL_EVENT = "mws:theme-spell";

const getSystemTheme = () => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const getStoredTheme = () => {
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

export const persistTheme = (theme) => {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // ignore persistence errors
    }
};

export const applyThemePreference = (theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const next = theme === "dark" ? "dark" : "light";
    root.classList.toggle("dark", next === "dark");
    root.dataset.theme = next;
    root.style.setProperty("color-scheme", next === "dark" ? "dark" : "light");
};

export const getThemeIncantation = (theme) => (theme === "dark" ? "Nox" : "Lumos Maxima");

export const emitThemeSpell = ({ theme, x = null, y = null, trigger = "user" } = {}) => {
    if (typeof window === "undefined") return;
    const next = theme === "dark" ? "dark" : "light";
    const detail = {
        theme: next,
        incantation: getThemeIncantation(next),
        x: typeof x === "number" ? x : null,
        y: typeof y === "number" ? y : null,
        trigger,
        timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent(THEME_SPELL_EVENT, { detail }));
};

export const syncInitialTheme = () => {
    const initial = getStoredTheme();
    applyThemePreference(initial);
    return initial;
};
