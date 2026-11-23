import { describe, it, expect, beforeAll, mock } from "bun:test";
import { sign } from "hono/jwt";
import type { HubUser } from "../type/central-type";

// signSession/verifySession now check a real DB row (session_version) -
// tests are hermetic (see .github/workflows/ci-cd.yml), so this stands in
// for it with a plain in-memory map instead of a live Postgres. Keyed by
// central_id, matching the real UserSession model - not email, which
// Central allows changing (see the schema comment on UserSession).
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

const { signSession, verifySession } = await import("../lib/session");
const { sessionEndsAt } = await import("../lib/session-expiry");

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

  it("expires at the end of the working week", async () => {
    const before = Date.now();
    const token = await signSession(testUser);
    const session = await verifySession(token);
    const expected = Math.floor(sessionEndsAt(before).getTime() / 1000);

    // Within a few seconds of the work-week end (the 8-hour floor can drift by the test's runtime).
    expect(session?.exp).toBeGreaterThanOrEqual(expected);
    expect(session?.exp).toBeLessThanOrEqual(expected + 5);
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

    expect(firstSession?.user.email).toBe("employee@millennia21.id");
    expect(laterSession?.user.email).toBe("new.email@millennia21.id");
  });

  it("keeps two device sessions valid at the same time", async () => {
    const first = await signSession(testUser);
    const second = await signSession(testUser);

    expect((await verifySession(first))?.sessionId).toBeTruthy();
    expect((await verifySession(second))?.sessionId).toBeTruthy();
    expect((await verifySession(first))?.sessionId).not.toBe((await verifySession(second))?.sessionId);
  });

  it("revokes one device without ending another", async () => {
    const first = await signSession(testUser);
    const second = await signSession(testUser);
    const firstSession = await verifySession(first);
    loginSessions.get(firstSession!.sessionId)!.revoked_at = new Date();

    expect(await verifySession(first)).toBeNull();
    expect(await verifySession(second)).not.toBeNull();
  });
});
