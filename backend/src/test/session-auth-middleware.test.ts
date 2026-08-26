import { describe, it, expect, beforeAll } from "bun:test";
import { Hono } from "hono";
import { sessionAuthMiddleware } from "../middleware/session-auth-middleware";
import { signSession } from "../lib/session";
import { ResponseError } from "../error/response-error";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

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
