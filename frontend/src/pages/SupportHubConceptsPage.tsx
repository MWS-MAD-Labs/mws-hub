import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Grid2X2,
  Home,
  Monitor,
  Moon,
  PanelLeft,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/assets/logo.webp";
import { cn } from "@/lib/utils";
import "./support-hub-concepts.css";

type ConceptId = "index" | "navigator" | "workspace";
type Viewport = "desktop" | "mobile";
type PreviewTheme = "light" | "dark" | "system";
type AppTone = "brand" | "navy" | "sky" | "sage" | "gold" | "neutral";

type MockApp = {
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  tone: AppTone;
  lastUsed?: string;
};

const CONCEPTS = [
  {
    id: "index" as const,
    number: "01",
    name: "Quiet Index",
    descriptor: "A direct, structured application index",
    summary: "The cleanest direction. Search, recent tools, and a disciplined directory with almost no decorative UI.",
  },
  {
    id: "navigator" as const,
    number: "02",
    name: "MWS Navigator",
    descriptor: "Category-led discovery",
    summary: "A stronger navigation concept. Categories are expressed through typography, numbering, and layout rather than cards and colour.",
  },
  {
    id: "workspace" as const,
    number: "03",
    name: "Personal Workspace",
    descriptor: "Pinned tools and daily context",
    summary: "A personal launcher without dashboard clutter. Pinned apps lead, while activity and announcements stay quiet and secondary.",
  },
];

const APPS: MockApp[] = [
  { name: "Student Central", description: "Student profiles, attendance, and pastoral context.", category: "Teaching & Students", icon: Users, tone: "sky", lastUsed: "Today, 08:24" },
  { name: "Progress Tracker", description: "Review learning progress, interventions, and evidence.", category: "Reporting", icon: BarChart3, tone: "navy", lastUsed: "Yesterday, 14:32" },
  { name: "Lesson Resources", description: "Classroom resources and teaching materials.", category: "Teaching & Students", icon: BookOpen, tone: "gold", lastUsed: "Monday, 10:15" },
  { name: "Room Booking", description: "Find and reserve rooms across the school campus.", category: "Workplace", icon: CalendarDays, tone: "sage" },
  { name: "Operations Desk", description: "Facilities, requests, and operational workflows.", category: "Operations", icon: BriefcaseBusiness, tone: "brand" },
  { name: "IT Support", description: "Request technical help and view service updates.", category: "Utilities", icon: CircleHelp, tone: "neutral" },
];

const iconTone: Record<AppTone, string> = {
  brand: "bg-[var(--mws-brand-soft)] text-[var(--mws-brand)]",
  navy: "bg-[var(--mws-navy-soft)] text-[var(--mws-navy)]",
  sky: "bg-[var(--mws-sky-soft)] text-[var(--mws-sky-text)]",
  sage: "bg-[var(--mws-sage-soft)] text-[var(--mws-sage-text)]",
  gold: "bg-[var(--mws-sunken)] text-[var(--mws-gold-text)]",
  neutral: "bg-[var(--mws-base)] text-[var(--mws-text-secondary)]",
};

function ThemeGlyph({ theme }: { theme: PreviewTheme }) {
  if (theme === "light") return <Sun className="h-3.5 w-3.5" />;
  if (theme === "dark") return <Moon className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--mws-brand)]">
        <img src={Logo} alt="" className="h-5 w-5 object-contain brightness-0 invert" />
      </div>
      {!compact ? <div><p className="mws-heading text-[11px] font-extrabold">MWS Hub</p><p className="mt-0.5 text-[8px] text-[var(--mws-text-tertiary)]">Support and applications</p></div> : null}
    </div>
  );
}

function Avatar() {
  return <div className="mws-heading grid h-9 w-9 place-items-center rounded-full bg-[var(--mws-brand-soft)] text-[10px] font-extrabold text-[var(--mws-brand)]">MA</div>;
}

function ThemeControl({ theme, compact = false }: { theme: PreviewTheme; compact?: boolean }) {
  return (
    <div className="flex items-center rounded-full border border-[var(--mws-border)] bg-[var(--mws-card)] p-1">
      {(["light", "dark", "system"] as PreviewTheme[]).map((item) => (
        <div key={item} className={cn("grid place-items-center rounded-full", compact ? "h-6 w-6" : "h-7 w-7", item === theme ? "bg-[var(--mws-brand)] text-white" : "text-[var(--mws-text-tertiary)]")}><ThemeGlyph theme={item} /></div>
      ))}
    </div>
  );
}

function AppIcon({ app, size = "md" }: { app: MockApp; size?: "sm" | "md" | "lg" }) {
  const Icon = app.icon;
  return <div className={cn("grid shrink-0 place-items-center rounded-xl", iconTone[app.tone], size === "sm" && "h-9 w-9", size === "md" && "h-11 w-11", size === "lg" && "h-14 w-14 rounded-2xl")}><Icon className={cn(size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5")} /></div>;
}

function SearchField({ shortcut = false, large = false }: { shortcut?: boolean; large?: boolean }) {
  return <div className={cn("flex items-center gap-3 rounded-xl border border-[var(--mws-border-strong)] bg-[var(--mws-card)] px-4", large ? "h-14" : "h-11")}><Search className="h-4 w-4 text-[var(--mws-text-tertiary)]" /><span className="flex-1 text-[10px] text-[var(--mws-text-tertiary)]">Search applications and services</span>{shortcut ? <span className="mws-heading rounded-md border border-[var(--mws-border)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--mws-text-tertiary)]">/</span> : null}</div>;
}

function StandardHeader({ theme, mobile = false, active = "Home" }: { theme: PreviewTheme; mobile?: boolean; active?: string }) {
  return <header className={cn("flex items-center border-b border-[var(--mws-border)] bg-[var(--mws-card)]", mobile ? "h-16 px-5" : "h-[68px] px-8")}><Brand compact={mobile} />{!mobile ? <nav className="mws-heading ml-12 flex gap-7 text-[9px] font-bold text-[var(--mws-text-tertiary)]">{["Home", "Applications", "Support"].map((item) => <span key={item} className={item === active ? "text-[var(--mws-brand)]" : undefined}>{item}</span>)}</nav> : null}<div className="ml-auto flex items-center gap-3">{!mobile ? <ThemeControl theme={theme} compact /> : null}<div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--mws-border)]"><Bell className="h-4 w-4 text-[var(--mws-text-secondary)]" /></div><Avatar /></div></header>;
}

function MobileNav({ active }: { active: "home" | "apps" | "search" }) {
  return <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-around border-t border-[var(--mws-border)] bg-[var(--mws-card)]"><Home className={cn("h-5 w-5", active === "home" ? "text-[var(--mws-brand)]" : "text-[var(--mws-text-tertiary)]")} /><Grid2X2 className={cn("h-5 w-5", active === "apps" ? "text-[var(--mws-brand)]" : "text-[var(--mws-text-tertiary)]")} /><Search className={cn("h-5 w-5", active === "search" ? "text-[var(--mws-brand)]" : "text-[var(--mws-text-tertiary)]")} /><UserRound className="h-5 w-5 text-[var(--mws-text-tertiary)]" /></div>;
}

function QuietIndex({ mobile, theme }: { mobile: boolean; theme: PreviewTheme }) {
  if (mobile) return <div className="relative min-h-[780px] bg-[var(--mws-base)]"><StandardHeader theme={theme} mobile /><main className="px-5 pb-20 pt-7"><p className="mws-heading text-[10px] font-bold text-[var(--mws-brand)]">Support Hub</p><h1 className="mws-heading mt-2 text-[28px] font-extrabold tracking-[-0.04em]">Find what you need.</h1><p className="mt-2 text-[10px] text-[var(--mws-text-secondary)]">Applications and internal services in one place.</p><div className="mt-5"><SearchField large /></div><div className="mt-4 flex gap-5 overflow-hidden border-b border-[var(--mws-border)] text-[9px] font-semibold text-[var(--mws-text-tertiary)]"><span className="shrink-0 border-b-2 border-[var(--mws-brand)] pb-3 text-[var(--mws-brand)]">All apps</span><span className="shrink-0 pb-3">Teaching</span><span className="shrink-0 pb-3">Reporting</span><span className="shrink-0 pb-3">Operations</span></div><section className="mt-7"><div className="flex items-center justify-between"><h2 className="mws-heading text-[12px] font-bold">Recent</h2><span className="text-[9px] text-[var(--mws-text-tertiary)]">3 applications</span></div><div className="mt-3 grid grid-cols-3 divide-x divide-[var(--mws-border)] border-y border-[var(--mws-border)] bg-[var(--mws-card)]">{APPS.slice(0, 3).map((app) => <div key={app.name} className="p-3"><AppIcon app={app} size="sm" /><p className="mws-heading mt-3 text-[9px] font-bold leading-tight">{app.name}</p></div>)}</div></section><section className="mt-7"><div className="flex items-center justify-between border-b border-[var(--mws-border-strong)] pb-3"><h2 className="mws-heading text-[12px] font-bold">All applications</h2><SlidersHorizontal className="h-4 w-4 text-[var(--mws-text-tertiary)]" /></div>{APPS.map((app) => <MobileAppRow key={app.name} app={app} />)}</section></main><MobileNav active="home" /></div>;

  return <div className="min-h-[780px] bg-[var(--mws-base)]"><StandardHeader theme={theme} /><main className="mx-auto max-w-[1120px] px-10 py-12"><div className="grid grid-cols-[1fr_0.75fr] items-end gap-12"><div><p className="mws-heading text-[11px] font-bold text-[var(--mws-brand)]">Support Hub</p><h1 className="mws-heading mt-3 text-[43px] font-extrabold tracking-[-0.055em]">Find what you need.</h1><p className="mt-3 text-[12px] text-[var(--mws-text-secondary)]">MWS applications, tools, and internal services in one place.</p></div><SearchField shortcut large /></div><section className="mt-12"><div className="flex items-end justify-between"><div><h2 className="mws-heading text-sm font-bold">Recent</h2><p className="mt-1 text-[9px] text-[var(--mws-text-tertiary)]">Continue where you left off</p></div><span className="text-[9px] text-[var(--mws-text-tertiary)]">Last 7 days</span></div><div className="mt-4 grid grid-cols-3 divide-x divide-[var(--mws-border)] border-y border-[var(--mws-border)] bg-[var(--mws-card)]">{APPS.slice(0, 3).map((app) => <div key={app.name} className="flex items-center gap-3 p-4"><AppIcon app={app} size="sm" /><div className="min-w-0"><p className="mws-heading text-[10px] font-bold">{app.name}</p><p className="mt-1 text-[8px] text-[var(--mws-text-tertiary)]">{app.lastUsed}</p></div><ArrowUpRight className="ml-auto h-3.5 w-3.5 text-[var(--mws-text-tertiary)]" /></div>)}</div></section><section className="mt-11"><div className="flex items-end justify-between border-b border-[var(--mws-border-strong)] pb-4"><div><h2 className="mws-heading text-lg font-extrabold">All applications</h2><div className="mt-4 flex gap-6 text-[9px] font-semibold text-[var(--mws-text-tertiary)]"><span className="border-b-2 border-[var(--mws-brand)] pb-2 text-[var(--mws-brand)]">All</span><span>Teaching & Students</span><span>Reporting</span><span>Workplace</span><span>Operations</span><span>Utilities</span></div></div><div className="flex items-center gap-2 text-[9px] text-[var(--mws-text-tertiary)]"><SlidersHorizontal className="h-3.5 w-3.5" /> Sort A–Z</div></div><div className="grid grid-cols-[1fr_0.65fr_0.38fr_0.2fr] border-b border-[var(--mws-border)] px-3 py-3 text-[8px] font-bold text-[var(--mws-text-tertiary)]"><span>Application</span><span>Category</span><span>Status</span><span /></div>{APPS.map((app) => <DesktopIndexRow key={app.name} app={app} />)}</section></main></div>;
}

function DesktopIndexRow({ app }: { app: MockApp }) {
  return <div className="grid grid-cols-[1fr_0.65fr_0.38fr_0.2fr] items-center border-b border-[var(--mws-border)] px-3 py-3"><div className="flex items-center gap-3"><AppIcon app={app} size="sm" /><div><p className="mws-heading text-[10px] font-bold">{app.name}</p><p className="mt-0.5 text-[8px] text-[var(--mws-text-tertiary)]">{app.description}</p></div></div><span className="text-[9px] text-[var(--mws-text-secondary)]">{app.category}</span><span className="flex items-center gap-2 text-[8px] text-[var(--mws-text-secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--mws-sage)]" />Available</span><button className="mws-heading justify-self-end rounded-full border border-[var(--mws-border-strong)] px-3 py-1.5 text-[8px] font-bold">Open</button></div>;
}

function MobileAppRow({ app }: { app: MockApp }) {
  return <div className="flex items-center gap-3 border-b border-[var(--mws-border)] py-3"><AppIcon app={app} size="sm" /><div className="min-w-0 flex-1"><p className="mws-heading text-[10px] font-bold">{app.name}</p><p className="mt-0.5 line-clamp-1 text-[8px] text-[var(--mws-text-tertiary)]">{app.description}</p></div><ChevronRight className="h-4 w-4 text-[var(--mws-text-tertiary)]" /></div>;
}

const CATEGORIES = [
  { number: "01", title: "Teaching & Students", count: "6 applications", description: "Student context, classroom resources, and learning tools." },
  { number: "02", title: "Reporting", count: "4 applications", description: "Progress, evidence, and school reporting." },
  { number: "03", title: "Workplace & Operations", count: "6 applications", description: "Rooms, facilities, and daily workflows." },
  { number: "04", title: "Utilities & Support", count: "3 applications", description: "Technical services and practical tools." },
];

function MwsNavigator({ mobile, theme }: { mobile: boolean; theme: PreviewTheme }) {
  if (mobile) return <div className="relative min-h-[780px] bg-[var(--mws-base)]"><StandardHeader theme={theme} mobile active="Applications" /><main className="px-5 pb-20 pt-7"><p className="mws-heading text-[10px] font-bold text-[var(--mws-brand)]">Application navigator</p><h1 className="mws-heading mt-2 text-[28px] font-extrabold tracking-[-0.04em]">Browse by category.</h1><div className="mt-5"><SearchField /></div><section className="mt-8 border-t border-[var(--mws-border-strong)]">{CATEGORIES.map((category, index) => <div key={category.number} className="border-b border-[var(--mws-border)] py-5"><div className="flex items-start gap-4"><span className="mws-heading pt-0.5 text-[10px] font-bold text-[var(--mws-brand)]">{category.number}</span><div className="flex-1"><div className="flex items-center justify-between"><h2 className="mws-heading text-sm font-bold">{category.title}</h2>{index === 0 ? <ChevronDown className="h-4 w-4 text-[var(--mws-brand)]" /> : <ChevronRight className="h-4 w-4 text-[var(--mws-text-tertiary)]" />}</div><p className="mt-1 text-[9px] text-[var(--mws-text-tertiary)]">{category.count}</p>{index === 0 ? <div className="mt-4 space-y-1">{APPS.slice(0, 2).map((app) => <MobileAppRow key={app.name} app={app} />)}</div> : null}</div></div></div>)}</section></main><MobileNav active="apps" /></div>;

  return <div className="flex min-h-[780px] bg-[var(--mws-base)]"><aside className="flex w-[76px] flex-col items-center border-r border-[var(--mws-border)] bg-[var(--mws-card)] py-5"><Brand compact /><div className="mt-12 space-y-3"><RailIcon icon={Home} label="Home" /><RailIcon icon={Grid2X2} label="Applications" active /><RailIcon icon={Clock3} label="Recent" /><RailIcon icon={CircleHelp} label="Support" /></div><div className="mt-auto"><Avatar /></div></aside><div className="min-w-0 flex-1"><header className="flex h-[68px] items-center border-b border-[var(--mws-border)] bg-[var(--mws-card)] px-8"><p className="mws-heading text-[11px] font-bold">Application navigator</p><div className="ml-auto flex items-center gap-3"><div className="w-[310px]"><SearchField shortcut /></div><ThemeControl theme={theme} compact /></div></header><main className="grid grid-cols-[0.85fr_1.15fr] gap-12 p-10"><section><p className="mws-heading text-[10px] font-bold text-[var(--mws-brand)]">Browse by category</p><h1 className="mws-heading mt-3 text-[36px] font-extrabold leading-tight tracking-[-0.05em]">A clearer way to find the right application.</h1><p className="mt-4 max-w-md text-[11px] leading-5 text-[var(--mws-text-secondary)]">Choose the part of your workday first. Applications stay grouped and easier to understand.</p><div className="mt-10 border-t border-[var(--mws-border-strong)]">{CATEGORIES.map((category, index) => <div key={category.number} className={cn("grid grid-cols-[42px_1fr_auto] items-start border-b border-[var(--mws-border)] py-5", index === 0 && "text-[var(--mws-brand)]")}><span className="mws-heading text-[10px] font-bold">{category.number}</span><div><h2 className="mws-heading text-[13px] font-bold">{category.title}</h2><p className="mt-1 text-[9px] text-[var(--mws-text-tertiary)]">{category.count}</p></div><ChevronRight className="h-4 w-4" /></div>)}</div></section><section className="border-l border-[var(--mws-border)] pl-10"><div className="flex items-end justify-between"><div><p className="text-[9px] text-[var(--mws-text-tertiary)]">01 / Teaching & Students</p><h2 className="mws-heading mt-2 text-2xl font-extrabold">Teaching & Students</h2><p className="mt-2 text-[10px] text-[var(--mws-text-secondary)]">Student context, classroom resources, and learning tools.</p></div><span className="text-[9px] text-[var(--mws-text-tertiary)]">6 applications</span></div><div className="mt-8 grid grid-cols-2 gap-x-6 border-t border-[var(--mws-border-strong)]">{[...APPS.slice(0, 3), APPS[5]].map((app) => <div key={app.name} className="flex min-h-[112px] items-start gap-3 border-b border-[var(--mws-border)] py-5"><AppIcon app={app} /><div className="min-w-0 flex-1"><p className="mws-heading text-[11px] font-bold">{app.name}</p><p className="mt-2 text-[9px] leading-4 text-[var(--mws-text-tertiary)]">{app.description}</p></div><ArrowUpRight className="h-3.5 w-3.5 text-[var(--mws-text-tertiary)]" /></div>)}</div><div className="mt-8 border-t border-[var(--mws-border)] pt-5"><p className="mws-heading text-[10px] font-bold">Selected application</p><div className="mt-4 flex items-center gap-4"><AppIcon app={APPS[0]} size="lg" /><div className="flex-1"><h3 className="mws-heading text-sm font-bold">Student Central</h3><p className="mt-1 text-[9px] text-[var(--mws-text-secondary)]">Available to teaching and pastoral staff</p></div><button className="mws-heading rounded-full bg-[var(--mws-brand)] px-5 py-2.5 text-[9px] font-bold text-white">Open application</button></div></div></section></main></div></div>;
}

function RailIcon({ icon: Icon, label, active = false }: { icon: LucideIcon; label: string; active?: boolean }) {
  return <div title={label} className={cn("grid h-10 w-10 place-items-center rounded-xl", active ? "bg-[var(--mws-brand)] text-white" : "text-[var(--mws-text-tertiary)]")}><Icon className="h-4 w-4" /></div>;
}

function PersonalWorkspace({ mobile, theme }: { mobile: boolean; theme: PreviewTheme }) {
  if (mobile) return <div className="relative min-h-[780px] bg-[var(--mws-base)]"><StandardHeader theme={theme} mobile /><main className="px-5 pb-20 pt-7"><p className="text-[10px] text-[var(--mws-text-tertiary)]">Tuesday, 7 October</p><h1 className="mws-heading mt-1 text-[27px] font-extrabold tracking-[-0.04em]">Good morning, Maya.</h1><div className="mt-5"><SearchField large /></div><section className="mt-7"><div className="flex items-center justify-between"><h2 className="mws-heading text-[12px] font-bold">Pinned</h2><span className="text-[9px] text-[var(--mws-brand)]">Edit</span></div><div className="mt-4 flex gap-5 overflow-hidden">{APPS.slice(0, 4).map((app) => <div key={app.name} className="w-[68px] shrink-0 text-center"><AppIcon app={app} size="lg" /><p className="mws-heading mt-2 line-clamp-2 text-[8px] font-bold leading-tight">{app.name}</p></div>)}</div></section><section className="mt-8"><div className="flex items-center justify-between border-b border-[var(--mws-border-strong)] pb-3"><h2 className="mws-heading text-[12px] font-bold">Applications</h2><span className="text-[9px] text-[var(--mws-text-tertiary)]">View all</span></div>{APPS.slice(0, 5).map((app) => <MobileAppRow key={app.name} app={app} />)}</section><section className="mt-8 border-t border-[var(--mws-border-strong)] pt-5"><p className="mws-heading text-[10px] font-bold text-[var(--mws-text-tertiary)]">Announcement</p><h3 className="mws-heading mt-2 text-[12px] font-bold">Library hours updated</h3><p className="mt-1 text-[9px] leading-4 text-[var(--mws-text-secondary)]">The library will remain open until 5:00 PM during project week.</p></section></main><MobileNav active="home" /></div>;

  return <div className="min-h-[780px] bg-[var(--mws-base)]"><StandardHeader theme={theme} /><main className="mx-auto grid max-w-[1160px] grid-cols-[minmax(0,1fr)_275px] gap-14 px-10 py-11"><section><p className="text-[10px] text-[var(--mws-text-tertiary)]">Tuesday, 7 October</p><h1 className="mws-heading mt-2 text-[38px] font-extrabold tracking-[-0.05em]">Good morning, Maya.</h1><p className="mt-2 text-[11px] text-[var(--mws-text-secondary)]">What do you need today?</p><div className="mt-6 max-w-2xl"><SearchField shortcut large /></div><section className="mt-10"><div className="flex items-center justify-between"><div><h2 className="mws-heading text-sm font-bold">Pinned applications</h2><p className="mt-1 text-[9px] text-[var(--mws-text-tertiary)]">Your shortcuts</p></div><button className="mws-heading text-[9px] font-bold text-[var(--mws-brand)]">Edit pinned</button></div><div className="mt-5 grid grid-cols-4 gap-4">{APPS.slice(0, 4).map((app) => <div key={app.name} className="border-t border-[var(--mws-border-strong)] pt-4"><AppIcon app={app} size="lg" /><p className="mws-heading mt-4 text-[10px] font-bold">{app.name}</p><p className="mt-1 text-[8px] text-[var(--mws-text-tertiary)]">{app.category}</p></div>)}</div></section><section className="mt-11"><div className="flex items-end justify-between border-b border-[var(--mws-border-strong)] pb-3"><h2 className="mws-heading text-lg font-extrabold">Applications</h2><div className="flex gap-5 text-[9px] text-[var(--mws-text-tertiary)]"><span className="text-[var(--mws-brand)]">All</span><span>Teaching</span><span>Reporting</span><span>Operations</span></div></div><div className="grid grid-cols-2 gap-x-8">{APPS.map((app) => <div key={app.name} className="flex items-center gap-3 border-b border-[var(--mws-border)] py-4"><AppIcon app={app} size="sm" /><div className="min-w-0 flex-1"><p className="mws-heading text-[10px] font-bold">{app.name}</p><p className="mt-0.5 truncate text-[8px] text-[var(--mws-text-tertiary)]">{app.description}</p></div><ArrowUpRight className="h-3.5 w-3.5 text-[var(--mws-text-tertiary)]" /></div>)}</div></section></section><aside className="border-l border-[var(--mws-border)] pl-7"><WorkspaceSideSection title="Recent activity"><Activity app={APPS[1]} time="Yesterday, 14:32" /><Activity app={APPS[0]} time="Today, 08:24" /><Activity app={APPS[3]} time="Monday, 09:10" /></WorkspaceSideSection><WorkspaceSideSection title="Announcement"><h3 className="mws-heading text-[11px] font-bold">Library hours updated</h3><p className="mt-2 text-[9px] leading-4 text-[var(--mws-text-secondary)]">The library will remain open until 5:00 PM during project week.</p><p className="mt-3 text-[8px] text-[var(--mws-text-tertiary)]">7 October 2026</p></WorkspaceSideSection><WorkspaceSideSection title="Service status"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--mws-sage)]" /><p className="mws-heading text-[10px] font-bold">All services available</p></div><p className="mt-2 text-[8px] text-[var(--mws-text-tertiary)]">Last checked 4 minutes ago</p></WorkspaceSideSection></aside></main></div>;
}

function WorkspaceSideSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-[var(--mws-border)] py-6 first:pt-0"><h2 className="mws-heading mb-5 text-[9px] font-bold text-[var(--mws-text-tertiary)]">{title}</h2>{children}</section>;
}

function Activity({ app, time }: { app: MockApp; time: string }) {
  return <div className="mb-4 flex items-center gap-3 last:mb-0"><AppIcon app={app} size="sm" /><div><p className="mws-heading text-[9px] font-bold">{app.name}</p><p className="mt-0.5 text-[8px] text-[var(--mws-text-tertiary)]">{time}</p></div></div>;
}

function PreviewSurface({ concept, viewport, theme }: { concept: ConceptId; viewport: Viewport; theme: PreviewTheme }) {
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const content: Record<ConceptId, ReactNode> = {
    index: <QuietIndex mobile={viewport === "mobile"} theme={theme} />,
    navigator: <MwsNavigator mobile={viewport === "mobile"} theme={theme} />,
    workspace: <PersonalWorkspace mobile={viewport === "mobile"} theme={theme} />,
  };
  return <div className={cn("mws-concept relative mx-auto overflow-hidden shadow-[0_28px_70px_rgb(0_0_0_/_28%)] ring-1 ring-white/10 transition-all duration-500", viewport === "desktop" ? "w-full rounded-[24px]" : "w-[390px] max-w-full rounded-[32px]", isDark && "dark")}>{content[concept]}</div>;
}

function ReviewControl({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-[#463638] bg-[#211718] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9f8b86]">{title}</p><div className="mt-3 flex gap-2">{children}</div></div>;
}

export default function SupportHubConceptsPage() {
  const [concept, setConcept] = useState<ConceptId>("index");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [theme, setTheme] = useState<PreviewTheme>("light");
  const [panelOpen, setPanelOpen] = useState(true);
  const current = useMemo(() => CONCEPTS.find((item) => item.id === concept) || CONCEPTS[0], [concept]);

  return <div className="min-h-screen bg-[#171112] text-[#fff7f1]"><header className="sticky top-0 z-50 border-b border-[#463638] bg-[#171112]/95 backdrop-blur-xl"><div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#351719] text-[#ffb2b6]"><PanelLeft className="h-4 w-4" /></div><div><p className="text-xs font-semibold">Support Hub design review</p><p className="mt-0.5 text-[9px] text-[#bdaaa5]">Clean directions using MWS colour and type</p></div></div><div className="ml-auto hidden items-center gap-1 rounded-xl border border-[#463638] bg-[#211718] p-1 md:flex">{CONCEPTS.map((item) => <button key={item.id} type="button" onClick={() => setConcept(item.id)} className={cn("rounded-lg px-3 py-2 text-[10px] font-semibold transition", concept === item.id ? "bg-[#fff7f1] text-[#241718]" : "text-[#bdaaa5] hover:text-[#fff7f1]")}>{item.number} · {item.name}</button>)}</div><button type="button" onClick={() => setPanelOpen((value) => !value)} className="grid h-9 w-9 place-items-center rounded-xl border border-[#463638] text-[#bdaaa5]"><Settings2 className="h-4 w-4" /></button></div></header><div className={cn("mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6", panelOpen && "xl:grid-cols-[285px_minmax(0,1fr)]")}><aside className={cn("space-y-5", !panelOpen && "hidden")}><div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e4bc67]">Choose a direction</p><div className="mt-3 space-y-2">{CONCEPTS.map((item) => <button key={item.id} type="button" onClick={() => setConcept(item.id)} className={cn("w-full rounded-2xl border p-4 text-left", concept === item.id ? "border-[#ffb2b6]/40 bg-[#351719]" : "border-[#463638] bg-[#211718]")}><div className="flex items-start justify-between"><span className="font-mono text-[10px] text-[#9f8b86]">{item.number}</span>{concept === item.id ? <Check className="h-4 w-4 text-[#ffb2b6]" /> : null}</div><p className="mt-3 text-sm font-semibold">{item.name}</p><p className="mt-1 text-[9px] text-[#bdaaa5]">{item.descriptor}</p></button>)}</div></div><ReviewControl title="Viewport">{(["desktop", "mobile"] as Viewport[]).map((item) => <button key={item} type="button" onClick={() => setViewport(item)} className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[9px] font-semibold capitalize", viewport === item ? "border-[#fff7f1] bg-[#fff7f1] text-[#241718]" : "border-[#463638] text-[#bdaaa5]")}><Monitor className="h-3.5 w-3.5" />{item}</button>)}</ReviewControl><ReviewControl title="Theme">{(["light", "dark", "system"] as PreviewTheme[]).map((item) => <button key={item} type="button" onClick={() => setTheme(item)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[8px] font-semibold capitalize", theme === item ? "border-[#e4bc67]/50 bg-[#302414] text-[#f0cf82]" : "border-[#463638] text-[#bdaaa5]")}><ThemeGlyph theme={item} />{item}</button>)}</ReviewControl><div className="rounded-2xl border border-[#463638] bg-[#211718] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9f8b86]">Design intent</p><p className="mt-3 text-[10px] leading-relaxed text-[#dfcfca]">{current.summary}</p><div className="mt-4 border-t border-[#463638] pt-4 text-[8px] leading-4 text-[#bdaaa5]">No decorative icons, gradients, quotes, motivational copy, or excessive cards. MWS colour and typography remain.</div></div></aside><main className="min-w-0"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#e4bc67]">Concept {current.number}</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{current.name}</h1><p className="mt-1 text-[10px] text-[#bdaaa5]">{current.descriptor} · {viewport} · {theme}</p></div><div className="flex gap-2 md:hidden">{CONCEPTS.map((item) => <button key={item.id} type="button" onClick={() => setConcept(item.id)} className={cn("grid h-9 w-9 place-items-center rounded-xl border text-[9px] font-bold", concept === item.id ? "border-[#fff7f1] bg-[#fff7f1] text-[#241718]" : "border-[#463638] text-[#bdaaa5]")}>{item.number}</button>)}</div></div><div className="rounded-[30px] border border-[#463638] bg-[#211718] p-2 sm:p-4 lg:p-6"><PreviewSurface concept={concept} viewport={viewport} theme={theme} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[9px] text-[#9f8b86]"><span>Mockup only. Production Support Hub remains unchanged.</span><span>MWS colour palette · Plus Jakarta Sans · Nunito Sans</span></div></main></div></div>;
}
