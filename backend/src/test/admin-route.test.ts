import { afterEach, beforeAll, describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { adminRoute } from "../route/admin-route";
import { signSession } from "../lib/session";
import { ResponseError } from "../error/response-error";
import * as centralClient from "../lib/central-client";
import { clearMadLabsUnitIdCacheForTest } from "../lib/admin-access";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

const TEST_MAD_LABS_UNIT_ID = "cmsr1gmkh000akz7bzjgdv6dq";
const originalFetch = global.fetch;

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

afterEach(() => {
  clearMadLabsUnitIdCacheForTest();
  global.fetch = originalFetch;
  mock.restore();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockCentralEmployees(unitId = TEST_MAD_LABS_UNIT_ID) {
  global.fetch = (async () =>
    jsonResponse(200, {
      success: true,
      data: [
        {
          id: "emp-mad-labs",
          employee_id: "15.26.905",
          full_name: "MAD Labs User",
          nick_name: "MAD",
          email: "mad@millennia21.id",
          photo_url: null,
          unit: "MAD Lab",
          unit_id: unitId,
          job_position: "Developer",
          job_level: "Staff",
          status: "ACTIVE",
          employment_type: "PROBATION",
        },
      ],
      paging: { current_page: 1, total_page: 1 },
    })) as unknown as typeof fetch;
}

function employee(overrides: Partial<HubUser & { source: "employee" }> = {}): HubUser {
  return {
    source: "employee",
    id: "emp-1",
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

describe("adminRoute", () => {
  it("admits a MAD Labs employee and returns the simple dashboard message", async () => {
    const app = buildApp();
    mockCentralEmployees();
    const centralUser = employee();
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(centralUser);
    const token = await signSession(employee({ unit_id: null, unitId: null }));
    const res = await app.request("/admin/dashboard-data", {
      headers: { Cookie: `hub_session=${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as DashboardBody;
    expect(body.data.message).toBe("Halo, Saya admin dari MAD Lab");
    expect(body.data.unitId).toBe(TEST_MAD_LABS_UNIT_ID);
  });

  it("refuses a non-MAD Labs employee", async () => {
    const app = buildApp();
    mockCentralEmployees();
    const centralUser = employee({
      unit: "Operations",
      unit_id: "unit-other",
      unitId: "unit-other",
    });
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(centralUser);
    const token = await signSession(
      employee({ unit: "Operations", unit_id: "unit-other", unitId: "unit-other" }),
    );
    const res = await app.request("/admin/dashboard-data", {
      headers: { Cookie: `hub_session=${token}` },
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as ErrorBody;
    expect(body.errors).toBe("Access denied. Only MAD Labs members can access the Admin Dashboard.");
  });
});
