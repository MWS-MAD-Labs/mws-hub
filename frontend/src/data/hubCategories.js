// Categories, colour tones and the icon registry for /support-hub.
//
// Icons are referenced by STRING, not by imported component, so the catalog
// stays JSON-serialisable. When the catalog becomes an admin-managed table
// served over the API, a row can carry "FileEdit" and nothing in the UI has
// to change. Adding an app then means adding one row, not editing a module.
import {
    FileEdit, FileCheck2, GaugeCircle, LayoutTemplate, FileDown, FileStack,
    Brain, HeartHandshake, BookOpenText,
    TrendingUp, ClipboardCheck, BookMarked,
    Wrench, Boxes, QrCode, PackageSearch,
    KeyRound, CopyPlus, ScanLine, AppWindow,
} from "lucide-react";

export const HUB_ICONS = {
    FileEdit, FileCheck2, GaugeCircle, LayoutTemplate, FileDown, FileStack,
    Brain, HeartHandshake, BookOpenText,
    TrendingUp, ClipboardCheck, BookMarked,
    Wrench, Boxes, QrCode, PackageSearch,
    KeyRound, CopyPlus, ScanLine,
};

export const getAppIcon = (name) => HUB_ICONS[name] || AppWindow;

// Five buckets derived from what the 19 real apps are FOR, not from which
// department owns them. Each one holds 3-6 apps, so no category exists just
// to hold a single item and none is big enough to need scrolling past.
export const HUB_CATEGORIES = [
    { id: "reporting", label: "Reporting", tone: "violet" },
    { id: "students", label: "Teaching & Students", tone: "sky" },
    { id: "workplace", label: "Workplace", tone: "emerald" },
    { id: "operations", label: "Operations", tone: "amber" },
    { id: "utilities", label: "Utilities", tone: "slate" },
];

// One solid tile colour per category, so colour groups apps instead of
// decorating them. Every tone is spelled out in full - Tailwind cannot see
// class names assembled by string concatenation.
export const CATEGORY_TONES = {
    violet: "bg-violet-500/12 text-violet-600 ring-violet-500/20 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/25",
    sky: "bg-sky-500/12 text-sky-600 ring-sky-500/20 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/25",
    emerald: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25",
    amber: "bg-amber-500/12 text-amber-600 ring-amber-500/20 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25",
    slate: "bg-slate-500/12 text-slate-600 ring-slate-500/20 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/25",
    neutral: "bg-muted/60 text-muted-foreground ring-border/60",
};

export const getCategory = (id) => HUB_CATEGORIES.find((c) => c.id === id) || null;
export const getCategoryLabel = (id) => getCategory(id)?.label || "Uncategorized";
export const getCategoryTone = (id) => CATEGORY_TONES[getCategory(id)?.tone] || CATEGORY_TONES.neutral;
