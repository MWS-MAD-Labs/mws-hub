import { describe, it, expect, beforeAll } from "bun:test";
import { sign } from "hono/jwt";
import { signSession, verifySession } from "../lib/session";
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

describe("signSession / verifySession", () => {
  it("round-trips the user it was signed with", async () => {
    const token = await signSession(testUser);
    const session = await verifySession(token);

    expect(session?.user).toEqual(testUser);
  });

  it("sets an expiry roughly 8 hours in the future", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signSession(testUser);
    const session = await verifySession(token);

    expect(session?.exp).toBeGreaterThan(before + 60 * 60 * 7);
    expect(session?.exp).toBeLessThanOrEqual(before + 60 * 60 * 8 + 5);
  });

  it("returns null for a garbage token instead of throwing", async () => {
    expect(await verifySession("not-a-real-jwt")).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const token = await sign(
      { user: testUser, exp: Math.floor(Date.now() / 1000) + 3600 },
      "a-different-secret",
      "HS256",
    );
    expect(await verifySession(token)).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const expiredToken = await sign(
      { user: testUser, exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET!,
      "HS256",
    );
    expect(await verifySession(expiredToken)).toBeNull();
  });
});
