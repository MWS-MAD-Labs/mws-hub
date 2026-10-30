import { afterEach, beforeAll, describe, expect, it, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { ResponseError } from "../error/response-error";
import * as centralClient from "../lib/central-client";
import type { SessionVariables } from "../type/hono-context";
import type { HubUser } from "../type/central-type";

const { gptCodeRoute } = await import("../route/gpt-code-route");
const { GptCodeUserController } = await import("../controller/gpt-code-user-controller");

function employee(): HubUser {
  return {
    source: "employee",
    id: "employee-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "Gmail Tester",
    nick_name: null,
    email: "asror@millennia21.id",
    photo_url: null,
    unit: "MAD Lab",
    unit_id: "unit-mad-lab",
    unitId: "unit-mad-lab",
    job_position: null,
    job_level: null,
    status: "ACTIVE",
    employment_type: null,
  };
}

function errorHandler(app: Hono<{ Variables: SessionVariables }>) {
  app.onError((error, c) => {
    if (error instanceof ResponseError) {
      return c.json({ errors: error.message }, error.status as 400);
    }
    throw error;
  });
  return app;
}

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-bun-test";
});

afterEach(() => {
  mock.restore();
});

describe("GPT Code Gmail route security", () => {
  it("does not expose the code flow without an existing Hub session", async () => {
    const app = errorHandler(new Hono<{ Variables: SessionVariables }>());
    app.route("/api/gpt-code", gptCodeRoute);
    const response = await app.request("/api/gpt-code/code", { method: "POST" });
    expect(response.status).toBe(401);
  });

  it("fails closed when the current Central identity no longer exists", async () => {
    const user = employee();
    spyOn(centralClient, "resolveCentralIdentityById").mockResolvedValue(null);
    const app = errorHandler(new Hono<{ Variables: SessionVariables }>());
    app.use("*", async (c, next) => {
      c.set("user", user);
      await next();
    });
    app.get("/account", GptCodeUserController.account);

    const response = await app.request("/account");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ errors: "Your Central account is no longer active." });
  });
});
