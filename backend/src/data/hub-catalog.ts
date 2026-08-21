import type { HubCatalogEntry } from "../type/catalog-type";

const PUBLIC: HubCatalogEntry["allowedSources"] = ["public"];
const TEACHERS: HubCatalogEntry["allowedSources"] = ["teacher"];
const STAFF: HubCatalogEntry["allowedSources"] = ["staff"];
const ADMIN: HubCatalogEntry["allowedSources"] = ["admin"];
const TEACHERS_AND_STAFF: HubCatalogEntry["allowedSources"] = ["teacher", "staff"];
const TEACHERS_PRINCIPALS_DIRECTOR: HubCatalogEntry["allowedSources"] = [
  "teacher",
  "principal",
  "director",
];
const STUDENTS_TEACHERS_STAFF_PRINCIPALS_DIRECTOR: HubCatalogEntry["allowedSources"] = [
  "student",
  "teacher",
  "staff",
  "principal",
  "director",
];
const EMPLOYEE_PERFORMANCE: HubCatalogEntry["allowedSources"] = [
  "teacher",
  "staff",
  "principal",
  "director",
];
const WOKO_ACCESS: HubCatalogEntry["allowedSources"] = [
  "head-unit",
  "principal",
  "director",
];

export const HUB_CATALOG: HubCatalogEntry[] = [
  // ── Reporting ────────────────────────────────────────────────────────
  {
    id: "report-assistant", name: "Report Assistant", icon: "FileEdit",
    description: "Generate individualised student reports.",
    category: "reporting", audience: "Teachers", keywords: ["narrative", "slides", "student report"],
    href: "https://mws.web.id/report-assistant", external: true,
    status: "active", discoverable: true, allowedSources: TEACHERS,
  },
  {
    id: "report-progress-tracker", name: "Report Progress Tracker", icon: "GaugeCircle",
    description: "Track student report progress.",
    category: "reporting", audience: "Teachers", keywords: ["progress", "status", "student report"],
    href: "https://mws.web.id/progress-tracker", external: true,
    status: "active", discoverable: true, allowedSources: TEACHERS,
  },
  {
    id: "report-auditor", name: "Report Auditor", icon: "FileCheck2",
    description: "Find pronoun and student-name mistakes.",
    category: "reporting", audience: "Teachers", keywords: ["audit", "proofread", "pronouns", "slide"],
    href: "https://mws.web.id/slide-auditor", external: true,
    status: "active", discoverable: true, allowedSources: TEACHERS,
  },
  {
    id: "slides-generator", name: "Slides Generator", icon: "LayoutTemplate",
    description: "Generate student slide report templates.",
    category: "reporting", audience: "Admin", keywords: ["template", "slide", "generate"],
    href: "https://mws.web.id/slide-generator", external: true,
    status: "active", discoverable: true, allowedSources: ADMIN,
  },
  {
    id: "slides-to-pdf", name: "Slides to PDF", icon: "FileDown",
    description: "Convert slides in a folder into individual PDFs.",
    category: "reporting", audience: "Public", keywords: ["convert", "export", "pdf", "drive", "batch"],
    href: "https://mws.web.id/slides-pdf", external: true,
    status: "active", discoverable: true, allowedSources: PUBLIC,
  },
  {
    id: "slides-batch-editor", name: "Slides Batch Editor", icon: "FileStack",
    description: "Edit slides within a folder in batch.",
    category: "reporting", audience: "Public", keywords: ["batch", "edit", "slide", "drive"],
    href: "https://mws.web.id/sbe", external: true,
    status: "active", discoverable: true, allowedSources: PUBLIC,
  },

  // ── Teaching & Students ──────────────────────────────────────────────
  {
    id: "mtss", name: "MTSS Dashboard", icon: "Brain",
    description: "MTSS management dashboard.",
    category: "students", audience: "Teachers, Principals, Director", keywords: ["intervention", "tier", "support"],
    href: "https://app.millenniaws.sch.id/mtss", external: true,
    status: "active", discoverable: true, allowedSources: TEACHERS_PRINCIPALS_DIRECTOR,
    sso: { appId: "mtss", entryUrl: `${process.env.MTSS_API_URL}/auth/sso` },
  },
  {
    id: "emotional-checkin", name: "Daily Emotional Check-in", icon: "HeartHandshake",
    description: "Daily emotional check-in and analytics.",
    category: "students", audience: "Student, Teachers, Staff, Principals, Director", keywords: ["mood", "wellbeing", "checkin", "analytics"],
    href: "https://app.millenniaws.sch.id/select-role", external: true,
    status: "active", discoverable: true, allowedSources: STUDENTS_TEACHERS_STAFF_PRINCIPALS_DIRECTOR,
    sso: { appId: "daily-checkin", entryUrl: `${process.env.DAILY_CHECKIN_API_URL}/auth/sso` },
  },
  {
    id: "reading-buddy", name: "Reading Buddy", icon: "BookOpenText",
    description: "MWS e-library platform.",
    category: "students", audience: "Teachers, Staff", keywords: ["library", "books", "reading", "e-library"],
    href: "https://reads.mws.web.id/", external: true,
    status: "active", discoverable: true, allowedSources: TEACHERS_AND_STAFF,
  },

  // ── Workplace ────────────────────────────────────────────────────────
  {
    id: "proofpoint", name: "ProofPoint", icon: "ClipboardCheck",
    description: "Performance appraisal and observation platform.",
    category: "workplace", audience: "Teachers, Staff, Principals, Director", keywords: ["appraisal", "observation", "performance"],
    href: "https://proof.mws.web.id/", external: true,
    status: "active", discoverable: true, allowedSources: EMPLOYEE_PERFORMANCE,
  },
  {
    id: "idp-dashboard", name: "Self Report IDP Dashboard", icon: "TrendingUp",
    description: "Access Personal Development report data.",
    category: "workplace", audience: "Staff", keywords: ["idp", "development", "self report", "growth"],
    href: "https://mws.web.id/ad-idp", external: true,
    status: "active", discoverable: true, allowedSources: STAFF,
  },
  {
    id: "mws-guide", name: "MWS Guide", icon: "BookMarked",
    description: "MWS knowledge base.",
    category: "workplace", audience: "Staff", keywords: ["knowledge base", "documentation", "wiki", "handbook"],
    href: "https://guide.mws.web.id/", external: true,
    status: "active", discoverable: true, allowedSources: STAFF,
  },

  // ── Operations ───────────────────────────────────────────────────────
  {
    id: "woko", name: "Woko - Work Orders", icon: "Wrench",
    description: "Facilities work-order tracking.",
    category: "operations", audience: "Head Unit, Principal, Director", keywords: ["facilities", "maintenance", "work order", "repair"],
    href: "https://woko.mws.web.id", external: true,
    status: "active", discoverable: true, allowedSources: WOKO_ACCESS,
  },
  {
    id: "exima", name: "Exima", icon: "PackageSearch",
    description: "Inventory export/import and kiosk tools.",
    category: "operations", audience: "Resource", keywords: ["inventory", "accurate", "kiosk", "peminjaman", "barang"],
    href: "https://exima.mws.web.id/", external: true,
    status: "active", discoverable: true, allowedSources: ["resource"],
  },
  {
    id: "ticket-scanner", name: "Ticket Scanner", icon: "QrCode",
    description: "Scan ticket QR codes and record data to Sheets.",
    category: "operations", audience: "Public", keywords: ["qr", "scan", "ticket", "event", "apps script"],
    href: "https://script.google.com/a/macros/millennia21.id/s/AKfycbxO21FO63bkOGKi2p86FwGs6sRWdd01jDLP0jtQKI8/dev?pli=1&authuser=0", external: true,
    status: "active", discoverable: true, allowedSources: PUBLIC,
  },
  {
    id: "it-assets", name: "New IT Assets Database", icon: "Boxes",
    description: "IT assets database and data-entry application.",
    category: "operations", audience: "Admin", keywords: ["asset", "inventory", "it", "hardware", "apps script"],
    href: "https://script.google.com/a/macros/millennia21.id/s/AKfycbwzGkbPgvdAm96UltJnRbvOgJO16dhSiRkmWy9y5Dv_zKkku8ZaMeZonxIk9MkfCZ0GPQ/exec", external: true,
    status: "active", discoverable: true, allowedSources: ADMIN,
  },

  // ── Utilities ────────────────────────────────────────────────────────
  {
    id: "gpt-code", name: "ChatGPT Login Code Generator", icon: "KeyRound",
    description: "Generate login verification codes automatically.",
    category: "utilities", audience: "Staff", keywords: ["chatgpt", "otp", "verification", "login", "code"],
    href: "https://mws.web.id/gpt-code", external: true,
    status: "active", discoverable: true, allowedSources: STAFF,
  },
  {
    id: "dupnshare", name: "Drive File Duplicator & Sharer", icon: "CopyPlus",
    description: "Create and share named file duplicates.",
    category: "utilities", audience: "Staff", keywords: ["drive", "duplicate", "share", "copy", "bulk"],
    href: "https://mws.web.id/dupnshare", external: true,
    status: "active", discoverable: true, allowedSources: STAFF,
  },
  {
    id: "tech-scans", name: "Tech-Scans Dashboard", icon: "ScanLine",
    description: "Tech-scans submission dashboard.",
    category: "utilities", audience: "MAD Labs", keywords: ["tech scan", "submission", "dashboard", "mad labs"],
    href: "https://mws.web.id/tech-scans", external: true,
    status: "active", discoverable: true, allowedSources: ["mad-labs"],
  },
];
