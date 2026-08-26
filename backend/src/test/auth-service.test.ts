import { describe, it, expect, spyOn, afterEach, beforeAll } from "bun:test";
import { AuthService } from "../service/auth-service";
import { GoogleAuth } from "../lib/google-auth";
import * as centralClient from "../lib/central-client";
import { verifySession } from "../lib/session";
import type { HubUser } from "../type/central-type";
import type { GooglePayload } from "../type/google-type";

const centralUser: HubUser = {
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

const googlePayload: GooglePayload = {
  email: "employee@millennia21.id",
  name: "Test Employee",
  google_id: "google-sub-1",
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-bun-test";
});

afterEach(() => {
  process.env.ALLOWED_DOMAIN = "millennia21.id";
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
});
