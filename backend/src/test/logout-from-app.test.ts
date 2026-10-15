import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import * as session from "../lib/session";
import * as revocation from "../lib/session-revocation";
import * as audit from "../service/audit-log-service";
import * as redirect from "../lib/logout-redirect";

const revoked: { email: string; personId?: string }[] = [];
let sessionUser: { id: string; email: string; person_id: string } | null = null;
let allowedRedirect: string | null = null;

// Spies, not module mocks: bun runs every test file in one process and a module mock stays for the files after this one.
const spies = [
  spyOn(session, "verifySession").mockImplementation((async () => (sessionUser ? { user: sessionUser } : null)) as unknown as typeof session.verifySession),
  spyOn(revocation, "revokeSessionsForUser").mockImplementation((async (email: string, personId?: string) => {
    revoked.push({ email, personId });
  }) as unknown as typeof revocation.revokeSessionsForUser),
  spyOn(audit, "recordAuditLog").mockImplementation((async () => null) as unknown as typeof audit.recordAuditLog),
  spyOn(redirect, "resolveLogoutRedirect").mockImplementation((async () => allowedRedirect) as unknown as typeof redirect.resolveLogoutRedirect),
];

process.env.FRONTEND_ORIGIN = "http://hub.test";
const { AuthController } = await import("../controller/auth-controller");

const app = new Hono();
app.get("/auth/logout", AuthController.logoutFromApp);

const logout = (query = "", cookie = "hub_session=token") =>
  app.request(`/auth/logout${query}`, { headers: cookie ? { cookie } : {} });

afterAll(() => {
  for (const spy of spies) spy.mockRestore();
});

describe("GET /auth/logout (sign-out from an app)", () => {
  beforeEach(() => {
    revoked.length = 0;
    sessionUser = { id: "u1", email: "a@x.id", person_id: "p1" };
    allowedRedirect = null;
  });

  it("lands on the Hub front page and leaves every session alone", async () => {
    const response = await logout("?email=a@x.id");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hub.test/");
    expect(revoked).toEqual([]);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("goes back to where the application asked, with the Hub session and the other apps untouched", async () => {
    allowedRedirect = "https://old-app.test/";
    const response = await logout("?redirect=https%3A%2F%2Fold-app.test%2F");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://old-app.test/");
    expect(revoked).toEqual([]);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("only redirects when the Hub has no session for the browser", async () => {
    sessionUser = null;
    const response = await logout("", "");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://hub.test/");
    expect(revoked).toEqual([]);
  });
});
