import { describe, it, expect, beforeAll, beforeEach, afterEach, mock } from "bun:test";
import { Hono } from "hono";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

// signSession/verifySession now check a real DB row (session_version) -
// tests are hermetic (see .github/workflows/ci-cd.yml), so this stands in
// for it with a plain in-memory map instead of a live Postgres.
const sessionVersions = new Map<string, number>();
const loginSessions = new Map<string, { id: string; central_id: string; account_version: number; expires_at: Date; revoked_at: Date | null }>();
let nextSessionId = 1;

mock.module("../lib/prisma", () => ({
  prisma: {
    userSession: {
      upsert: async ({
        where,
        create,
      }: {
        where: { central_id: string };
        create: { session_version: number };
      }) => {
        const next = sessionVersions.get(where.central_id) ?? create.session_version;
        sessionVersions.set(where.central_id, next);
        return { central_id: where.central_id, session_version: next };
      },
      findUnique: async ({ where }: { where: { central_id: string } }) => {
        if (!sessionVersions.has(where.central_id)) return null;
        return { central_id: where.central_id, session_version: sessionVersions.get(where.central_id)! };
      },
    },
    loginSession: {
      create: async ({ data }: { data: { central_id: string; account_version: number; expires_at: Date } }) => {
        const row = { id: `session-${nextSessionId++}`, central_id: data.central_id, account_version: data.account_version, expires_at: data.expires_at, revoked_at: null };
        loginSessions.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) => loginSessions.get(where.id) ?? null,
    },
  },
}));

const { sessionAuthMiddleware } = await import("../middleware/session-auth-middleware");
const { signSession } = await import("../lib/session");

const testUser: HubUser = {
  source: "employee",
  id: "emp-1",
  person_id: "person-1",
  employee_id: "E001",
  full_name: "Test Employee",
  nick_name: null,
  email: "employee@millennia21.id",
  photo_url: null,
  unit: null,
  job_position: null,
  job_level: null,
  status: "ACTIVE",
  employment_type: null,
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-bun-test";
});

beforeEach(() => {
  process.env.HUB_CENTRAL_ACCESS_MODE = "off";
});

afterEach(() => {
  delete process.env.HUB_CENTRAL_ACCESS_MODE;
});

async function errorBody(res: Response): Promise<{ errors: string }> {
  return (await res.json()) as { errors: string };
}

function buildApp() {
  const app = new Hono<{ Variables: SessionVariables }>();
  app.get("/protected", sessionAuthMiddleware, (c) => c.json({ data: c.var.user }));
  app.onError((err, c) => {
    if (err instanceof ResponseError) {
      return c.json({ errors: err.message }, err.status as 400);
    }
    throw err;
  });
  return app;
}

describe("sessionAuthMiddleware", () => {
  it("refuses a request with no session cookie", async () => {
    const app = buildApp();
    const res = await app.request("/protected");

    expect(res.status).toBe(401);
    expect((await errorBody(res)).errors).toBe("Not signed in.");
  });

  it("refuses a request with a malformed session cookie", async () => {
    const app = buildApp();
    const res = await app.request("/protected", {
      headers: { Cookie: "hub_session=not-a-real-jwt" },
    });

    expect(res.status).toBe(401);
    expect((await errorBody(res)).errors).toBe("Session expired or invalid.");
  });

  it("admits a request with a valid session cookie and exposes the user on context", async () => {
    const app = buildApp();
    const token = await signSession(testUser);
    const res = await app.request("/protected", {
      headers: { Cookie: `hub_session=${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: HubUser };
    expect(body.data).toEqual(testUser);
  });

  it("reads the cookie name from SESSION_COOKIE_NAME instead of a hardcoded default", async () => {
    const original = process.env.SESSION_COOKIE_NAME;
    process.env.SESSION_COOKIE_NAME = "custom_session_cookie";

    const app = buildApp();
    const token = await signSession(testUser);
    const res = await app.request("/protected", {
      headers: { Cookie: `custom_session_cookie=${token}` },
    });

    expect(res.status).toBe(200);

    if (original === undefined) delete process.env.SESSION_COOKIE_NAME;
    else process.env.SESSION_COOKIE_NAME = original;
  });
});
