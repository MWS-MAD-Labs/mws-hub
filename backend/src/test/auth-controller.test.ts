import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { AuthController } from "../controller/auth-controller";
import type { HubUser } from "../type/central-type";
import type { SessionVariables } from "../type/hono-context";
import { prisma } from "../lib/prisma";

type MeResponse = {
  data: Record<string, unknown>;
};

const admin: HubUser = {
  source: "admin",
  id: "cmv09qj5j0000r17blfdr8xfq",
  admin_no: "ADM-00001",
  email: "asror@millennia21.id",
  full_name: "asror",
  role: "SUPER_ADMIN",
  avatar_url:
    "http://localhost:9010/mws-data-center/admin-avatars/admin/avatar.avif",
  unit_id: "cmv09q4zg000a7w7bm8yyr537",
  job_position: "Junior Full Stack Web Developer",
  job_position_id: "cmv09q50l000s7w7bropx35tm",
  job_level: "Staff",
  job_level_id: "cmv09q526001m7w7b3n7tderl",
  building: "Millennia 21 Building",
  building_id: "cmv09q52g001p7w7bbbr8q7e6",
  education_level: null,
  is_active: true,
  last_login: "2026-10-28T03:19:13.025Z",
  created_at: "2026-10-09T01:10:16.951Z",
  type: "admin",
  is_protected: true,
  is_identifier_change_approver: false,
  is_employee_identifier_change_approver: false,
  is_head_of_care: false,
  person_id: "cmv0aisvt000p7i7bolfjklwn",
};

describe("AuthController.me", () => {
  async function getMeResponse(user: HubUser) {
    const app = new Hono<{ Variables: SessionVariables }>();
    app.get("/auth/me", (c) => {
      c.set("user", user);
      return AuthController.me(c);
    });

    const response = await app.request("/auth/me");
    expect(response.status).toBe(200);
    return response.json() as Promise<MeResponse>;
  }

  it("returns Central admin fields without Hub-only identity properties", async () => {
    expect(await getMeResponse(admin)).toEqual({
      data: {
        id: "cmv09qj5j0000r17blfdr8xfq",
        admin_no: "ADM-00001",
        email: "asror@millennia21.id",
        full_name: "asror",
        role: "SUPER_ADMIN",
        avatar_url:
          "http://localhost:9010/mws-data-center/admin-avatars/admin/avatar.avif",
        unit_id: "cmv09q4zg000a7w7bm8yyr537",
        job_position: "Junior Full Stack Web Developer",
        job_position_id: "cmv09q50l000s7w7bropx35tm",
        job_level: "Staff",
        job_level_id: "cmv09q526001m7w7b3n7tderl",
        building: "Millennia 21 Building",
        building_id: "cmv09q52g001p7w7bbbr8q7e6",
        education_level: null,
        is_active: true,
        last_login: "2026-10-28T03:19:13.025Z",
        created_at: "2026-10-09T01:10:16.951Z",
        type: "admin",
        is_protected: true,
        is_identifier_change_approver: false,
        is_employee_identifier_change_approver: false,
        is_head_of_care: false,
        person_id: "cmv0aisvt000p7i7bolfjklwn",
      },
    });
  });

  it("keeps building and job_level keys when Central only supplies their IDs", async () => {
    const user: HubUser = {
      ...admin,
      building: undefined,
      job_level: undefined,
    };

    const response = await getMeResponse(user);
    expect(response.data).toMatchObject({
      job_position: "Junior Full Stack Web Developer",
      job_position_id: "cmv09q50l000s7w7bropx35tm",
      job_level: null,
      job_level_id: "cmv09q526001m7w7b3n7tderl",
      building: null,
      building_id: "cmv09q52g001p7w7bbbr8q7e6",
      education_level: null,
    });
  });

  it("returns an employee avatar_url and omits photo_url", async () => {
    const employee: HubUser = {
      source: "employee",
      id: "cmv0aisvv000q7i7by3g3wbgc",
      person_id: "cmv0aisvt000p7i7bolfjklwn",
      employee_id: "32.12.312",
      full_name: "Asror",
      nick_name: "Asror",
      email: "asror@millennia21.id",
      photo_url: null,
      avatar_url: "https://central.test/avatar.avif",
      unit: "MAD Lab",
      job_position: "Junior Full Stack Web Developer",
      job_level: "Staff",
      status: "ACTIVE",
      employment_type: "PROBATION",
    };

    const response = await getMeResponse(employee);
    expect(response.data).toMatchObject({
      source: "employee",
      avatar_url: "https://central.test/avatar.avif",
    });
    expect(response.data).not.toHaveProperty("photo_url");
  });

  it("maps an employee photo_url to avatar_url when Central has no avatar_url", async () => {
    const employee: HubUser = {
      source: "employee",
      id: "employee-1",
      person_id: "person-1",
      employee_id: "E001",
      full_name: "Test Employee",
      nick_name: null,
      email: "employee@millennia21.id",
      photo_url: "https://central.test/photo.avif",
      unit: null,
      job_position: null,
      job_level: null,
      status: "ACTIVE",
      employment_type: null,
    };

    const response = await getMeResponse(employee);
    expect(response.data).toMatchObject({
      avatar_url: "https://central.test/photo.avif",
    });
    expect(response.data).not.toHaveProperty("photo_url");
  });
});

describe("AuthController.sessions", () => {
  it("returns paginated active sessions with active and history counts", async () => {
    const now = new Date();
    const rows = [
      {
        id: "session-current",
        device_name: "Chrome on Windows",
        trusted_at: now,
        created_at: now,
        last_seen_at: now,
        expires_at: new Date(now.getTime() + 60_000),
        revoked_at: null,
      },
    ];
    // Other test files replace ../lib/prisma with partial mocks (bun's
    // mock.module leaks across files), so loginSession may not exist here.
    const db = prisma as unknown as Record<string, any>;
    const hadLoginSession = "loginSession" in db && db.loginSession != null;
    if (!hadLoginSession) db.loginSession = {};
    const originalTransaction = prisma.$transaction;
    const originalFindMany = prisma.loginSession.findMany;
    const originalCount = prisma.loginSession.count;
    prisma.loginSession.findMany = (async () => rows) as typeof prisma.loginSession.findMany;
    prisma.loginSession.count = (async (args?: { where?: { OR?: unknown } }) => args?.where?.OR ? 4 : 2) as unknown as typeof prisma.loginSession.count;
    prisma.$transaction = (async (queries: Promise<unknown>[]) => Promise.all(queries)) as typeof prisma.$transaction;

    const app = new Hono<{ Variables: SessionVariables }>();
    app.get("/auth/sessions", (c) => {
      c.set("user", admin);
      c.set("session", { user: admin, sessionId: "session-current", sessionVersion: 1, exp: Math.floor(Date.now() / 1000) + 3600 });
      return AuthController.sessions(c);
    });
    const response = await app.request("/auth/sessions?status=active&page=1&pageSize=20");
    const body = await response.json() as {
      data: Array<{ current: boolean; status: string }>;
      meta: { pagination: { total: number }; counts: { active: number; history: number } };
    };

    expect(body.data[0]).toMatchObject({ current: true, status: "active" });
    expect(body.meta.pagination.total).toBe(2);
    expect(body.meta.counts).toEqual({ active: 2, history: 4 });

    prisma.$transaction = originalTransaction;
    prisma.loginSession.findMany = originalFindMany;
    prisma.loginSession.count = originalCount;
    if (!hadLoginSession) delete db.loginSession;
  });
});
