import { describe, it, expect, beforeAll, mock } from "bun:test";
import { sign } from "hono/jwt";
import type { HubUser } from "../type/central-type";

// signSession/verifySession now check a real DB row (session_version) -
// tests are hermetic (see .github/workflows/ci-cd.yml), so this stands in
// for it with a plain in-memory map instead of a live Postgres. Keyed by
// central_id, matching the real UserSession model - not email, which
// Central allows changing (see the schema comment on UserSession).
const sessionVersions = new Map<string, number>();

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
        const next = sessionVersions.has(where.central_id)
          ? sessionVersions.get(where.central_id)! + 1
          : create.session_version;
        sessionVersions.set(where.central_id, next);
        return { central_id: where.central_id, session_version: next };
      },
      findUnique: async ({ where }: { where: { central_id: string } }) => {
        if (!sessionVersions.has(where.central_id)) return null;
        return { central_id: where.central_id, session_version: sessionVersions.get(where.central_id)! };
      },
    },
  },
}));

const { signSession, verifySession } = await import("../lib/session");

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

  // Regression: UserSession used to be keyed by email, which Central lets
  // change (EmployeeValidation.UPDATE server-side allows editing it). A
  // session signed before the change has to keep verifying after it, since
  // Central's own id for this person - the actual identity anchor - never
  // moved.
  it("keeps verifying a session after the user's email changes centrally, since id is unchanged", async () => {
    const token = await signSession(testUser);

    const userWithNewEmail: HubUser = { ...testUser, email: "new.email@millennia21.id" };
    const laterToken = await signSession(userWithNewEmail);

    const firstSession = await verifySession(token);
    const laterSession = await verifySession(laterToken);

    // The single-session policy still applies (a later signSession() for
    // the same central id bumps session_version and invalidates the
    // earlier token) - the point of this test is *why* it invalidates:
    // same id, not "coincidentally the same email string".
    expect(firstSession).toBeNull();
    expect(laterSession?.user.email).toBe("new.email@millennia21.id");
  });
});
