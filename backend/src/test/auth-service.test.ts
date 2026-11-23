import { describe, it, expect, spyOn, afterEach, beforeAll, mock } from "bun:test";
import { GoogleAuth } from "../lib/google-auth";
import * as centralClient from "../lib/central-client";
import type { HubUser } from "../type/central-type";
import type { GooglePayload } from "../type/google-type";

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

const { AuthService } = await import("../service/auth-service");
const { verifySession } = await import("../lib/session");

const centralUser: HubUser = {
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

const googlePayload: GooglePayload = {
  email: "employee@millennia21.id",
  name: "Test Employee",
  google_id: "google-sub-1",
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-bun-test";
});

afterEach(() => {
  mock.restore();
  process.env.ALLOWED_DOMAIN = "millennia21.id";
});

describe("AuthService.loginWithGoogle and the Central access gate", () => {
  it("refuses a person without Hub access before any session or revocation happens", async () => {
    process.env.HUB_CENTRAL_ACCESS_MODE = "enforce";
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue(googlePayload);
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue({ ...centralUser, person_id: "person-gate" } as HubUser);
    spyOn(centralClient, "lookupApplicationEntitlement").mockResolvedValue(null);

    const error = await AuthService.loginWithGoogle("code").catch((caught) => caught);
    expect(error.status).toBe(403);
    expect(error.code).toBe("hub_access_denied");
    expect(sessionVersions.has("emp-1")).toBe(false);
    delete process.env.HUB_CENTRAL_ACCESS_MODE;
  });
});

describe("AuthService.loginWithGoogle", () => {
  it("rejects when Google can't verify the auth code", async () => {
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue(null);

    await expect(AuthService.loginWithGoogle("bad-code")).rejects.toThrow(
      "Google sign-in failed.",
    );
  });

  it("rejects an email outside ALLOWED_DOMAIN before ever calling Central", async () => {
    process.env.ALLOWED_DOMAIN = "millennia21.id";
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue({
      ...googlePayload,
      email: "someone@gmail.com",
    });
    const centralSpy = spyOn(centralClient, "resolveCentralIdentity");

    await expect(AuthService.loginWithGoogle("code")).rejects.toThrow(
      "Only @millennia21.id accounts can sign in.",
    );
    expect(centralSpy).not.toHaveBeenCalled();
  });

  it("skips the domain check entirely when ALLOWED_DOMAIN is unset", async () => {
    delete process.env.ALLOWED_DOMAIN;
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue({
      ...googlePayload,
      email: "someone@gmail.com",
    });
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(centralUser);

    const { user } = await AuthService.loginWithGoogle("code");
    expect(user).toEqual(centralUser);
  });

  it("rejects an authenticated Google account Central has no record of", async () => {
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue(googlePayload);
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(null);

    await expect(AuthService.loginWithGoogle("code")).rejects.toThrow(
      "This account isn't registered in the Central database yet.",
    );
  });

  it("signs a usable session for a recognized Central identity", async () => {
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue(googlePayload);
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(centralUser);

    const { token, user } = await AuthService.loginWithGoogle("code");
    expect(user).toEqual(centralUser);

    const session = await verifySession(token);
    expect(session?.user).toEqual(centralUser);
  });

  it("uses the verified Google avatar when Central has no employee photo", async () => {
    const avatarUrl = "https://google.test/avatar.jpg";
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue({
      ...googlePayload,
      avatar_url: avatarUrl,
    });
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(centralUser);

    const { token, user } = await AuthService.loginWithGoogle("code");
    expect(user).toMatchObject({ avatar_url: avatarUrl });

    const session = await verifySession(token);
    expect(session?.user).toMatchObject({ avatar_url: avatarUrl });
  });

  it("keeps an existing device session valid when the same user logs in again", async () => {
    spyOn(GoogleAuth, "verifyCode").mockResolvedValue(googlePayload);
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(centralUser);

    const first = await AuthService.loginWithGoogle("code");
    const second = await AuthService.loginWithGoogle("code");

    expect((await verifySession(first.token))?.sessionId).toBe(first.sessionId);
    expect((await verifySession(second.token))?.sessionId).toBe(second.sessionId);
    expect(first.sessionId).not.toBe(second.sessionId);
  });
});
