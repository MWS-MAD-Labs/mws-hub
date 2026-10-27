import { listPublishedApplications } from "../lib/central-client";
import { hubSsoJwks } from "../lib/sso-relay";
import { logger } from "../lib/logger";
import { centralCatalogState } from "./central-catalog-service";

// What the admin dashboard shows: whether the Hub is healthy, what people launched, and what is broken.

export type Check = { id: string; label: string; status: "ok" | "warning" | "problem"; detail: string };
export type AppHealth = { id: string; name: string; address: string | null; status: "up" | "down" | "no_address"; detail: string };
export type AppActivity = { id: string; name: string; launches7: number; launches30: number; failures30: number; last_launch_at: string | null };
export type Overview = {
  generated_at: string;
  health: { status: "ok" | "warning" | "problem"; checks: Check[]; apps: AppHealth[] };
  activity: { launches7: number; launches30: number; failures30: Record<string, number>; apps: AppActivity[]; never_opened: { id: string; name: string }[] };
  reports: { open: number; by_app: { application_id: string; name: string; open: number }[] };
};

export type OverviewDeps = {
  now?: () => Date;
  publishedApplications: () => Promise<{ id: string; name: string; launch_url: string }[]>;
  // Per application and outcome since the first date, with how many of them are since the second.
  launchCounts: (since: Date, recent: Date) => Promise<{ application_id: string; outcome: string; count: number; recent: number; last_at: Date }[]>;
  openReports: () => Promise<{ application_id: string; name: string; open: number }[]>;
  reach: (address: string) => Promise<"up" | "down">;
  // How many sign-in keys the Hub publishes.
  keyCount: () => number;
  env: NodeJS.ProcessEnv;
};

const FAILURES = new Set(["unknown_app", "central_unavailable", "account_inactive", "entitlement_denied", "maintenance", "coming_soon", "no_link"]);
const DAY = 86_400_000;
const rank = { ok: 0, warning: 1, problem: 2 } as const;

// Any answer under 500 means something is running at the address. No redirects, a short wait, and the body is dropped.
export async function reachAddress(address: string): Promise<"up" | "down"> {
  try {
    const url = new URL(address);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "down";
    const response = await fetch(new URL("/", url.origin), { redirect: "manual", signal: AbortSignal.timeout(4000) });
    await response.body?.cancel();
    return response.status >= 500 ? "down" : "up";
  } catch {
    return "down";
  }
}

async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(...(await Promise.all(items.slice(index, index + size).map(work))));
  }
  return out;
}

export async function buildOverview(deps: OverviewDeps): Promise<Overview> {
  const now = (deps.now ?? (() => new Date()))();
  const checks: Check[] = [];

  let published: { id: string; name: string; launch_url: string }[] = [];
  const started = Date.now();
  try {
    published = await deps.publishedApplications();
    checks.push({ id: "central", label: "Central", status: "ok", detail: `Answered in ${Date.now() - started} ms, ${published.length} applications published.` });
  } catch (error) {
    logger.error("Overview: Central did not answer:", error);
    checks.push({ id: "central", label: "Central", status: "problem", detail: "Central did not answer. Cards come from the last answer the Hub kept." });
  }

  const secret = (deps.env.HUB_INTERNAL_SECRET ?? "").trim();
  checks.push({
    id: "secret",
    label: "Hub secret",
    status: secret.length >= 16 ? "ok" : "problem",
    detail: secret.length >= 16 ? "HUB_INTERNAL_SECRET is set." : "HUB_INTERNAL_SECRET is missing or too short, applications cannot sign in.",
  });
  checks.push({
    id: "shared-secret",
    label: "Shared secret",
    status: deps.env.HUB_ALLOW_SHARED_SECRET === "false" ? "ok" : "warning",
    detail:
      deps.env.HUB_ALLOW_SHARED_SECRET === "false"
        ? "Only applications with a secret of their own are accepted."
        : "Applications may still use the Hub's master secret. Set HUB_ALLOW_SHARED_SECRET=false once all have their own.",
  });
  let keys = 0;
  try {
    keys = deps.keyCount();
  } catch {
    keys = 0;
  }
  checks.push({ id: "keys", label: "Sign-in keys", status: keys > 0 ? "ok" : "problem", detail: keys > 0 ? "The Hub publishes its sign-in key." : "No sign-in key. Applications cannot verify who signs in." });

  const apps = await inBatches(published, 6, async (app): Promise<AppHealth> => {
    if (!app.launch_url) return { id: app.id, name: app.name, address: null, status: "no_address", detail: "No address." };
    const result = await deps.reach(app.launch_url);
    return { id: app.id, name: app.name, address: app.launch_url, status: result, detail: result === "up" ? "Answers." : "Nothing answers at its address." };
  });
  const down = apps.filter((app) => app.status === "down");
  checks.push({
    id: "apps",
    label: "Applications",
    status: down.length === 0 ? "ok" : "warning",
    detail: down.length === 0 ? "Every published application answers." : `${down.length} of ${apps.length} do not answer: ${down.map((app) => app.name).join(", ")}.`,
  });

  const since30 = new Date(now.getTime() - 30 * DAY);
  const since7 = new Date(now.getTime() - 7 * DAY);
  const counts = await deps.launchCounts(since30, since7);
  const names = new Map(published.map((app) => [app.id, app.name]));
  const per = new Map<string, AppActivity>();
  const failures30: Record<string, number> = {};
  let launches7 = 0;
  let launches30 = 0;
  for (const row of counts) {
    const entry = per.get(row.application_id) ?? { id: row.application_id, name: names.get(row.application_id) ?? row.application_id, launches7: 0, launches30: 0, failures30: 0, last_launch_at: null };
    entry.launches30 += row.count;
    launches30 += row.count;
    entry.launches7 += row.recent;
    launches7 += row.recent;
    if (FAILURES.has(row.outcome)) {
      entry.failures30 += row.count;
      failures30[row.outcome] = (failures30[row.outcome] ?? 0) + row.count;
    }
    const last = row.last_at.toISOString();
    if (!entry.last_launch_at || last > entry.last_launch_at) entry.last_launch_at = last;
    per.set(row.application_id, entry);
  }
  const activityApps = [...per.values()].sort((left, right) => right.launches30 - left.launches30);
  const neverOpened = published.filter((app) => !per.has(app.id)).map((app) => ({ id: app.id, name: app.name }));

  const reports = await deps.openReports();
  const status = checks.reduce<"ok" | "warning" | "problem">((worst, check) => (rank[check.status] > rank[worst] ? check.status : worst), "ok");
  return {
    generated_at: now.toISOString(),
    health: { status, checks, apps },
    activity: { launches7, launches30, failures30, apps: activityApps, never_opened: neverOpened },
    reports: { open: reports.reduce((sum, row) => sum + row.open, 0), by_app: reports.sort((left, right) => right.open - left.open) },
  };
}

let cache: { at: number; value: Overview } | null = null;
export function clearOverviewCacheForTest() {
  cache = null;
}

// The live version: reads Central and the database, cached for half a minute.
export async function hubOverview(): Promise<Overview> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  // Loaded here so reading the checks does not need the database client until it has to.
  const { prisma } = await import("../lib/prisma");
  const value = await buildOverview({
    env: process.env,
    publishedApplications: async () => (await listPublishedApplications()).map((app) => ({ id: app.id, name: app.name, launch_url: app.launch_url })),
    launchCounts: async (since, recent) => {
      const rows = await prisma.$queryRaw<{ application_id: string; outcome: string; count: bigint; recent: bigint; last_at: Date }[]>`
        SELECT entity_id AS application_id, COALESCE(metadata->>'outcome', 'unknown') AS outcome, COUNT(*) AS count,
          COUNT(*) FILTER (WHERE created_at >= ${recent}) AS recent, MAX(created_at) AS last_at
        FROM audit_logs
        WHERE action = 'application.launch' AND created_at >= ${since}
        GROUP BY entity_id, COALESCE(metadata->>'outcome', 'unknown')`;
      return rows.map((row) => ({ ...row, count: Number(row.count), recent: Number(row.recent) }));
    },
    openReports: async () => {
      const rows = await prisma.appReport.groupBy({ by: ["application_id"], where: { status: { not: "RESOLVED" } }, _count: { _all: true } });
      const names = new Map((await centralCatalogState()).entries.map((entry) => [entry.id, entry.name]));
      return rows.map((row) => ({ application_id: row.application_id, name: names.get(row.application_id) ?? row.application_id, open: row._count._all }));
    },
    reach: reachAddress,
    keyCount: () => hubSsoJwks().keys.length,
  });
  cache = { at: Date.now(), value };
  return value;
}
