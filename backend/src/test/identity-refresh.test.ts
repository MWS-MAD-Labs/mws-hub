import { afterEach, beforeAll, describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { ResponseError } from "../error/response-error";
import * as centralClient from "../lib/central-client";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

// A plain map stands in for the session row, like the other session tests.
const sessionVersions = new Map<string, number>();

mock.module("../lib/prisma", () => ({
  prisma: {
    userSession: {
      upsert: async ({ where, create }: { where: { central_id: string }; create: { session_version: number } }) => {
        const next = sessionVersions.has(where.central_id) ? sessionVersions.get(where.central_id)! + 1 : create.session_version;
        sessionVersions.set(where.central_id, next);
        return { session_version: next };
      },
      findUnique: async ({ where }: { where: { central_id: string } }) =>
        sessionVersions.has(where.central_id)
          ? { central_id: where.central_id, session_version: sessionVersions.get(where.central_id)! }
          : null,
    },
  },
}));

const { sessionAuthMiddleware } = await import("../middleware/session-auth-middleware");
const { signSession, verifySession } = await import("../lib/session");

const person = (extra: Partial<HubUser> = {}): HubUser =>
  ({
    source: "employee",
    id: "emp-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "Test Employee",
    nick_name: null,
    email: "employee@millennia21.id",
    photo_url: null,
    unit: "Elementary",
    job_position: "Teacher",
    job_level: "Staff",
    status: "ACTIVE",
    employment_type: null,
    ...extra,
  }) as HubUser;

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-bun-test";
});

afterEach(() => {
  delete process.env.HUB_IDENTITY_REFRESH_MINUTES;
  delete process.env.HUB_CENTRAL_ACCESS_MODE;
});

function buildApp() {
  const app = new Hono<{ Variables: SessionVariables }>();
  app.get("/protected", sessionAuthMiddleware, (c) => c.json({ data: c.var.user }));
  app.onError((err, c) => {
    if (err instanceof ResponseError) return c.json({ errors: err.message }, err.status as 400);
    throw err;
  });
  return app;
}

const later = (minutes: number) => {
  const now = Date.now();
  return spyOn(Date, "now").mockReturnValue(now + minutes * 60_000);
};

describe("keeping the copy of the person in the session current", () => {
  it("does not ask Central while the copy is young", async () => {
    const lookup = spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(person());
    const token = await signSession(person());
    const res = await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } });
    expect(res.status).toBe(200);
    expect(lookup).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
    lookup.mockRestore();
  });

  it("asks Central again once the copy is older than the refresh time and keeps the session", async () => {
    const token = await signSession(person());
    const before = (await verifySession(token))!;
    const lookup = spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(person({ full_name: "Renamed Employee" }));
    const clock = later(11);

    const res = await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: HubUser }).data.full_name).toBe("Renamed Employee");
    expect(lookup).toHaveBeenCalledWith("emp-1", "employee");

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("hub_session=");
    const newToken = cookie.split("hub_session=")[1].split(";")[0];
    clock.mockRestore();
    const after = (await verifySession(newToken))!;
    expect(after.user.full_name).toBe("Renamed Employee");
    expect(after.sessionVersion).toBe(before.sessionVersion);
    expect(after.exp).toBe(before.exp);
    lookup.mockRestore();
  });

  it("keeps the copy the session has when Central cannot be reached", async () => {
    const token = await signSession(person());
    const lookup = spyOn(centralClient, "resolveCentralIdentityById").mockRejectedValue(new Error("down"));
    const clock = later(11);
    const res = await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } });
    clock.mockRestore();
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: HubUser }).data.full_name).toBe("Test Employee");
    lookup.mockRestore();
  });

  it("ends the session of someone Central no longer lists as active", async () => {
    const token = await signSession(person());
    const lookup = spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(null);
    const clock = later(11);
    const res = await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } });
    clock.mockRestore();
    expect(res.status).toBe(401);
    expect(((await res.json()) as { errors: string }).errors).toBe("Your account is no longer active.");
    lookup.mockRestore();
  });

  it("can be turned off, or set to another time", async () => {
    const token = await signSession(person());
    const lookup = spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(person({ full_name: "Changed" }));

    process.env.HUB_IDENTITY_REFRESH_MINUTES = "0";
    let clock = later(60);
    expect((await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } })).status).toBe(200);
    clock.mockRestore();
    expect(lookup).not.toHaveBeenCalled();

    process.env.HUB_IDENTITY_REFRESH_MINUTES = "30";
    clock = later(20);
    await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } });
    clock.mockRestore();
    expect(lookup).not.toHaveBeenCalled();

    clock = later(31);
    await buildApp().request("/protected", { headers: { Cookie: `hub_session=${token}` } });
    clock.mockRestore();
    expect(lookup).toHaveBeenCalledTimes(1);
    lookup.mockRestore();
  });
});
