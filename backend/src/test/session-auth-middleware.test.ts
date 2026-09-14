import { describe, it, expect, beforeAll, mock } from "bun:test";
import { Hono } from "hono";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

// signSession/verifySession now check a real DB row (session_version) -
// tests are hermetic (see .github/workflows/ci-cd.yml), so this stands in
// for it with a plain in-memory map instead of a live Postgres.
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

const { sessionAuthMiddleware } = await import("../middleware/session-auth-middleware");
const { signSession } = await import("../lib/session");

const testUser: HubUser = {
  source: "employee",
  id: "emp-1",
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
