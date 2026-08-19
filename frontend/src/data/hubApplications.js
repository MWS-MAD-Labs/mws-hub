// The real MWS application catalog, still static. Every field here is meant
// to survive the move to an admin-managed table later - no React components,
// no functions except the one route that genuinely depends on the user.
//
// Fields:
//   audience      - who the app is for today. Shown only on locked cards,
//                   where "who can get in" is the useful answer.
//   keywords      - invisible search fodder. This is how one app becomes
//                   findable from several angles without belonging to two
//                   categories (see the note on multi-category below).
//   access        - 'granted' | 'locked'. Hardcoded until RBAC exists.
//   discoverable  - false hides the app outright instead of locking it, for
//                   tools a normal user should not even know about.
//   href: null    - the app exists but has no registered URL yet.
//
// No `pinned` field on purpose: a "featured" row that repeats apps already
// in the grid is duplicate content. Recently Used needs real usage data.
//
// MTSS and Daily Check-in used to be same-app internal routes back when the
// Hub lived inside mws-daily-checkin. Now that the Hub is its own app, every
// entry is a plain external URL like the rest of the catalog - the role-
// aware landing route (MTSS's old resolveHref) becomes that app's own
// problem to solve on arrival, or gets carried as a hint once the
// token-relay SSO handoff exists.

export const HUB_APPLICATIONS = [
    // ── Reporting ────────────────────────────────────────────────────────
    {
        id: "report-assistant", name: "Report Assistant", icon: "FileEdit",
        description: "Generate individualised student reports.",
        category: "reporting", audience: "Teachers", keywords: ["narrative", "slides", "student report"],
        href: "https://mws.web.id/report-assistant", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "report-progress-tracker", name: "Report Progress Tracker", icon: "GaugeCircle",
        description: "Track student report progress.",
        category: "reporting", audience: "Teachers", keywords: ["progress", "status", "student report"],
        href: "https://mws.web.id/progress-tracker", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "report-auditor", name: "Report Auditor", icon: "FileCheck2",
        description: "Find pronoun and student-name mistakes.",
        category: "reporting", audience: "Teachers", keywords: ["audit", "proofread", "pronouns", "slide"],
        href: "https://mws.web.id/slide-auditor", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "slides-generator", name: "Slides Generator", icon: "LayoutTemplate",
        description: "Generate student slide report templates.",
        category: "reporting", audience: "Admin", keywords: ["template", "slide", "generate"],
        href: "https://mws.web.id/slide-generator", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "slides-to-pdf", name: "Slides to PDF", icon: "FileDown",
        description: "Convert slides in a folder into individual PDFs.",
        category: "reporting", audience: "Everyone", keywords: ["convert", "export", "pdf", "drive", "batch"],
        href: "https://mws.web.id/slides-pdf", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "slides-batch-editor", name: "Slides Batch Editor", icon: "FileStack",
        description: "Edit slides within a folder in batch.",
        category: "reporting", audience: "Everyone", keywords: ["batch", "edit", "slide", "drive"],
        href: "https://mws.web.id/sbe", external: true,
        status: "active", access: "granted", discoverable: true,
    },

    // ── Teaching & Students ──────────────────────────────────────────────
    {
        id: "mtss", name: "MTSS Dashboard", icon: "Brain",
        description: "MTSS management dashboard.",
        category: "students", audience: "Teachers, Principals, Director", keywords: ["intervention", "tier", "support"],
        href: "https://app.millenniaws.sch.id/mtss", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "emotional-checkin", name: "Daily Emotional Check-in", icon: "HeartHandshake",
        description: "Daily emotional check-in and analytics.",
        category: "students", audience: "Everyone", keywords: ["mood", "wellbeing", "checkin", "analytics"],
        href: "https://app.millenniaws.sch.id/select-role", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "reading-buddy", name: "Reading Buddy", icon: "BookOpenText",
        description: "MWS e-library platform.",
        category: "students", audience: "Teachers, Staff", keywords: ["library", "books", "reading", "e-library"],
        href: "https://reads.mws.web.id/", external: true,
        status: "active", access: "granted", discoverable: true,
    },

    // ── Workplace ────────────────────────────────────────────────────────
    {
        id: "proofpoint", name: "ProofPoint", icon: "ClipboardCheck",
        description: "Performance appraisal and observation platform.",
        category: "workplace", audience: "Teachers, Staff, Principals, Director", keywords: ["appraisal", "observation", "performance"],
        href: "https://proof.mws.web.id/", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "idp-dashboard", name: "Self Report IDP Dashboard", icon: "TrendingUp",
        description: "Access Personal Development report data.",
        category: "workplace", audience: "Staff", keywords: ["idp", "development", "self report", "growth"],
        href: "https://mws.web.id/ad-idp", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "mws-guide", name: "MWS Guide", icon: "BookMarked",
        description: "MWS knowledge base.",
        category: "workplace", audience: "Staff", keywords: ["knowledge base", "documentation", "wiki", "handbook"],
        href: "https://guide.mws.web.id/", external: true,
        status: "active", access: "granted", discoverable: true,
    },

    // ── Operations ───────────────────────────────────────────────────────
    {
        id: "woko", name: "Woko — Work Orders", icon: "Wrench",
        description: "Facilities work-order tracking.",
        category: "operations", audience: "Head Unit, Principal, Director", keywords: ["facilities", "maintenance", "work order", "repair"],
        href: "https://woko.mws.web.id", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "exima", name: "Exima", icon: "PackageSearch",
        description: "Inventory export/import and kiosk tools.",
        category: "operations", audience: "Resource", keywords: ["inventory", "accurate", "kiosk", "peminjaman", "barang"],
        href: "https://exima.mws.web.id/", external: true,
        status: "active", access: "locked", discoverable: true,
    },
    {
        id: "ticket-scanner", name: "Ticket Scanner", icon: "QrCode",
        description: "Scan ticket QR codes and record data to Sheets.",
        category: "operations", audience: "Everyone", keywords: ["qr", "scan", "ticket", "event", "apps script"],
        href: null, external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "it-assets", name: "IT Assets Database", icon: "Boxes",
        description: "IT assets database and data-entry application.",
        category: "operations", audience: "Admin", keywords: ["asset", "inventory", "it", "hardware", "apps script"],
        href: null, external: true,
        status: "active", access: "locked", discoverable: true,
    },

    // ── Utilities ────────────────────────────────────────────────────────
    {
        id: "gpt-code", name: "ChatGPT Login Code Generator", icon: "KeyRound",
        description: "Generate login verification codes automatically.",
        category: "utilities", audience: "Staff", keywords: ["chatgpt", "otp", "verification", "login", "code"],
        href: "https://mws.web.id/gpt-code", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "dupnshare", name: "Drive File Duplicator & Sharer", icon: "CopyPlus",
        description: "Create and share named file duplicates.",
        category: "utilities", audience: "Staff", keywords: ["drive", "duplicate", "share", "copy", "bulk"],
        href: "https://mws.web.id/dupnshare", external: true,
        status: "active", access: "granted", discoverable: true,
    },
    {
        id: "tech-scans", name: "Tech-Scans Dashboard", icon: "ScanLine",
        description: "Tech-scans submission dashboard.",
        category: "utilities", audience: "MAD Labs", keywords: ["tech scan", "submission", "dashboard", "mad labs"],
        href: "https://mws.web.id/tech-scans", external: true,
        status: "active", access: "locked", discoverable: true,
    },
];
