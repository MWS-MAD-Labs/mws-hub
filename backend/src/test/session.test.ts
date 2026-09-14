import { describe, it, expect, beforeAll, mock } from "bun:test";
import { sign } from "hono/jwt";
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

const { signSession, verifySession } = await import("../lib/session");

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
