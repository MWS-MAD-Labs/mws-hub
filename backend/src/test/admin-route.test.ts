import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { ResponseError } from "../error/response-error";
import * as centralClient from "../lib/central-client";
import { clearHubAccessCacheForTest } from "../lib/hub-access-gate";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

// signSession/verifySession (used via sessionAuthMiddleware inside
// adminRoute, and directly below) now check a real DB row
// (session_version) - tests are hermetic (see .github/workflows/ci-cd.yml),
// so this stands in for it with a plain in-memory map instead of a live
// Postgres.
const sessionVersions = new Map<string, number>();

mock.module("../lib/prisma", () => ({
  prisma: {
    userSession: {
      upsert: async ({
        where,
        create,
      }: {
        where: { email: string };
        create: { session_version: number };
      }) => {
        const next = sessionVersions.has(where.email)
          ? sessionVersions.get(where.email)! + 1
          : create.session_version;
        sessionVersions.set(where.email, next);
        return { email: where.email, session_version: next };
      },
      findUnique: async ({ where }: { where: { email: string } }) => {
        if (!sessionVersions.has(where.email)) return null;
        return { email: where.email, session_version: sessionVersions.get(where.email)! };
      },
    },
  },
}));

const { adminRoute } = await import("../route/admin-route");
const { signSession } = await import("../lib/session");

const TEST_MAD_LABS_UNIT_ID = "cmsr1gmkh000akz7bzjgdv6dq";

type DashboardBody = {
  data: {
    message: string;
    unitId: string | null;
  };
};

type ErrorBody = {
  errors: string;
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-bun-test";
});

beforeEach(() => clearHubAccessCacheForTest());

afterEach(() => {
  clearHubAccessCacheForTest();
  delete process.env.HUB_CENTRAL_ACCESS_MODE;
  mock.restore();
});

function employee(overrides: Partial<HubUser & { source: "employee" }> = {}): HubUser {
  return {
    source: "employee",
    id: "emp-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "Test Employee",
    nick_name: null,
    email: "employee@millennia21.id",
    photo_url: null,
    unit: "MAD Lab",
    unit_id: TEST_MAD_LABS_UNIT_ID,
    unitId: TEST_MAD_LABS_UNIT_ID,
    job_position: null,
    job_level: null,
    status: "ACTIVE",
    employment_type: null,
    ...overrides,
  } as HubUser;
}

function withRole(permissions: string[]) {
  spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue({
    id: "group:rule-1",
    person_id: "person-1",
    application_id: "hub",
    organization_id: "org-1",
    role: "ROLE",
    permissions,
    is_active: true,
    version: 1,
  } as never);
}

function buildApp() {
  const app = new Hono<{ Variables: SessionVariables }>();
  app.route("/admin", adminRoute);
  app.onError((err, c) => {
    if (err instanceof ResponseError) {
      return c.json({ errors: err.message }, err.status as 400);
    }
    throw err;
  });
  return app;
}

async function openDashboard(user: HubUser) {
  spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(user);
  const token = await signSession(user);
  return buildApp().request("/admin/dashboard-data", { headers: { Cookie: `hub_session=${token}` } });
}

describe("adminRoute", () => {
  it("admits someone whose role carries hub.admin and returns the simple dashboard message", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    withRole(["hub.use", "hub.admin"]);
    const res = await openDashboard(employee());

    expect(res.status).toBe(200);
    const body = (await res.json()) as DashboardBody;
    expect(body.data.message).toBe("Halo, Saya admin dari MAD Lab");
    expect(body.data.unitId).toBe(TEST_MAD_LABS_UNIT_ID);
  });

  it("refuses a staff role, also in the MAD Labs unit", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    withRole(["hub.use"]);
    const res = await openDashboard(employee());

    expect(res.status).toBe(403);
    const body = (await res.json()) as ErrorBody;
    expect(body.errors).toBe("Access denied. The Admin Dashboard needs the hub.admin permission in Central.");
  });
});
