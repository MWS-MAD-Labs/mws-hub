import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Strong text sanitizer for user inputs.
 * - removes HTML tags
 * - strips script/event keywords and dangerous protocols
 * - removes URLs
 * - normalizes repeated whitespace (without forcing trim while typing)
 */
export function sanitizeText(v = "", maxLen = 1200) {
    return String(v || "")
        .replace(/<[^>]*>/g, "") // HTML tags
        .replace(/\b(?:javascript:|data:|vbscript:)/gi, "") // dangerous protocols
        .replace(/\b(?:onerror|onload|onclick|onchange|oninput)\b/gi, "") // event attrs
        .replace(/https?:\/\/[^\s]+/gi, "") // links
        .replace(/\s{2,}/g, " ")
        .slice(0, maxLen);
}

/**
 * Lighter sanitizer variant (keep it consistent across fields)
 */
export function sanitizeLight(v = "", maxLen = 1200) {
    return String(v || "")
        .replace(/<[^>]*>/g, "")
        .replace(/\b(?:javascript:|data:|vbscript:)/gi, "")
        .replace(/https?:\/\/[^\s]+/gi, "")
        .slice(0, maxLen);
}

/**
 * Strip non-digits (useful for currency input)
 */
export function toRawNumber(str = "") {
    return String(str).replace(/[^0-9]/g, "");
}

/**
 * IDR currency formatter
 */
export function fmtCurrency(n = 0) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);
}

/**
 * Clamp a number within [min, max]
 */
export function clampNumber(value, min, max, fallback = min) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

/**
 * Simple debounce helper
 */
export function debounce(fn, delay = 220) {
    let t;
    return (...args) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Basic email validation
 */
export function isValidEmail(str = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(str).trim());
}
