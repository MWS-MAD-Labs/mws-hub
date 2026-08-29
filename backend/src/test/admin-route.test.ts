import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { adminRoute } from "../route/admin-route";
import { MAD_LABS_UNIT_ID } from "../lib/admin-access";
import { signSession } from "../lib/session";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

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
    unit_id: MAD_LABS_UNIT_ID,
    unitId: MAD_LABS_UNIT_ID,
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
    const token = await signSession(employee());
    const res = await app.request("/admin/dashboard-data", {
      headers: { Cookie: `hub_session=${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as DashboardBody;
    expect(body.data.message).toBe("Halo, Saya admin dari MAD Lab");
    expect(body.data.unitId).toBe(MAD_LABS_UNIT_ID);
  });

  it("refuses a non-MAD Labs employee", async () => {
    const app = buildApp();
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
