import { describe, expect, it } from "bun:test";
import { buildOverview, type OverviewDeps } from "../service/overview-service";

const NOW = new Date("2026-10-13T08:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

function deps(over: Partial<OverviewDeps> = {}): OverviewDeps {
  return {
    now: () => NOW,
    env: { HUB_INTERNAL_SECRET: "x".repeat(32), HUB_ALLOW_SHARED_SECRET: "false" },
    publishedApplications: async () => [
      { id: "daily-checkin", name: "Daily Check-in", launch_url: "https://daily.test/auth/sso" },
      { id: "exima", name: "Exima", launch_url: "https://exima.test/auth/sso" },
      { id: "quiet", name: "Quiet", launch_url: "https://quiet.test" },
    ],
    launchCounts: async () => [
      { application_id: "daily-checkin", outcome: "redirected", count: 40, recent: 12, last_at: hoursAgo(1) },
      { application_id: "daily-checkin", outcome: "entitlement_denied", count: 3, recent: 1, last_at: hoursAgo(30) },
      { application_id: "exima", outcome: "maintenance", count: 2, recent: 2, last_at: hoursAgo(5) },
    ],
    openReports: async () => [
      { application_id: "exima", name: "Exima", open: 1 },
      { application_id: "daily-checkin", name: "Daily Check-in", open: 3 },
    ],
    keyCount: () => 1,
    reach: async (address) => (address.includes("exima") ? "down" : "up"),
    ...over,
  };
}

describe("hub overview", () => {
  it("sums launches and failures per application and finds those never opened", async () => {
    const overview = await buildOverview(deps());
    expect(overview.activity.launches30).toBe(45);
    expect(overview.activity.launches7).toBe(15);
    expect(overview.activity.failures30).toEqual({ entitlement_denied: 3, maintenance: 2 });
    expect(overview.activity.apps[0]).toMatchObject({ id: "daily-checkin", launches30: 43, failures30: 3 });
    expect(overview.activity.never_opened).toEqual([{ id: "quiet", name: "Quiet" }]);
  });

  it("warns about applications that do not answer", async () => {
    const overview = await buildOverview(deps());
    expect(overview.health.apps.find((app) => app.id === "exima")?.status).toBe("down");
    expect(overview.health.checks.find((check) => check.id === "apps")).toMatchObject({ status: "warning" });
    expect(overview.health.status).toBe("warning");
  });

  it("calls it a problem when Central does not answer or the secret is missing", async () => {
    const overview = await buildOverview(
      deps({
        env: {},
        publishedApplications: async () => {
          throw new Error("down");
        },
      }),
    );
    const byId = Object.fromEntries(overview.health.checks.map((check) => [check.id, check.status]));
    expect(byId.central).toBe("problem");
    expect(byId.secret).toBe("problem");
    expect(overview.health.status).toBe("problem");
  });

  it("orders open reports by how many an application has", async () => {
    const overview = await buildOverview(deps());
    expect(overview.reports.open).toBe(4);
    expect(overview.reports.by_app[0]).toMatchObject({ application_id: "daily-checkin", open: 3 });
  });
});
