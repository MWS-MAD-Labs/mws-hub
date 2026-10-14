import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

const revoked: { email: string; personId?: string }[] = [];
let sessionUser: { id: string; email: string; person_id: string } | null = null;
let allowedRedirect: string | null = null;

const realSession = await import("../lib/session");
const realRevocation = await import("../lib/session-revocation");
const realAudit = await import("../service/audit-log-service");
const realRedirect = await import("../lib/logout-redirect");

mock.module("../lib/session", () => ({
  ...realSession,
  verifySession: async () => (sessionUser ? { user: sessionUser } : null),
}));
mock.module("../lib/session-revocation", () => ({
  ...realRevocation,
  revokeSessionsForUser: async (email: string, personId?: string) => {
    revoked.push({ email, personId });
  },
}));
mock.module("../service/audit-log-service", () => ({ ...realAudit, recordAuditLog: async () => null }));
mock.module("../lib/logout-redirect", () => ({ ...realRedirect, resolveLogoutRedirect: async () => allowedRedirect }));

process.env.FRONTEND_ORIGIN = "http://hub.test";
const { AuthController } = await import("../controller/auth-controller");

const app = new Hono();
app.get("/auth/logout", AuthController.logoutFromApp);

const logout = (query = "", cookie = "hub_session=token") =>
  app.request(`/auth/logout${query}`, { headers: cookie ? { cookie } : {} });

describe("GET /auth/logout (sign-out from an app)", () => {
  beforeEach(() => {
    revoked.length = 0;
    sessionUser = { id: "u1", email: "a@x.id", person_id: "p1" };
    allowedRedirect = null;
  });

  it("ends the person's sessions in the other apps, keeps the Hub session, and lands on the Hub front page", async () => {
    const response = await logout("?email=a@x.id");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hub.test/");
    expect(revoked).toEqual([{ email: "a@x.id", personId: "p1" }]);
    expect(response.headers.get("set-cookie") ?? "").not.toContain("hub_session");
  });

  it("leaves every session alone when the app was signed in as someone else", async () => {
    const response = await logout("?email=other@x.id");
    expect(response.status).toBe(302);
    expect(revoked).toEqual([]);
  });

  it("only redirects when the Hub has no session for the browser", async () => {
    sessionUser = null;
    const response = await logout("?email=a@x.id", "");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hub.test/");
    expect(revoked).toEqual([]);
  });

  it("keeps the old way for an application with its own session: the Hub signs out too and the relay page follows", async () => {
    allowedRedirect = "https://old-app.test/";
    const response = await logout("?email=a@x.id&redirect=https%3A%2F%2Fold-app.test%2F");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hub.test/logout-relay");
    const cookies = response.headers.getSetCookie().join(" ");
    expect(cookies).toContain("hub_session=;");
    expect(cookies).toContain("hub_post_logout_redirect=https%3A%2F%2Fold-app.test%2F");
    expect(revoked).toEqual([{ email: "a@x.id", personId: "p1" }]);
  });

  it("still leaves everything alone for the old way when the app signed in as someone else", async () => {
    allowedRedirect = "https://old-app.test/";
    const response = await logout("?email=other@x.id&redirect=https%3A%2F%2Fold-app.test%2F");
    expect(response.headers.get("location")).toBe("https://old-app.test/");
    expect(revoked).toEqual([]);
    expect(response.headers.get("set-cookie") ?? "").not.toContain("hub_session");
  });
});
