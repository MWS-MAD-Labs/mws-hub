import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { AuthService } from "../service/auth-service";
import { GoogleAuth } from "../lib/google-auth";
import { ResponseError } from "../error/response-error";
import { resolveLogoutRedirect } from "../lib/logout-redirect";
import { frontendOrigin } from "../lib/frontend-origin";
import { logger } from "../lib/logger";
import { verifySession } from "../lib/session";
import { sessionCookieOptions } from "../lib/session-cookie";
import { AppsService } from "../service/apps-service";
import { revokeSessionsForUser } from "../lib/session-revocation";
import { recordAuditLog } from "../service/audit-log-service";
import { getUserUnitId, isHubAdmin } from "../lib/admin-access";
import { hubAccessMode, resolveHubAccess } from "../lib/hub-access-gate";
import type { SessionVariables } from "../type/hono-context";
import { sanitizeLaunchRedirect } from "../lib/sso-state";
import { endSharedSession, handleRefresh, handleRestore, issueSharedSession, type RefreshDeps } from "../lib/shared-session";
import { prisma } from "../lib/prisma";
import { resolveCentralIdentityById } from "../lib/central-client";

const OAUTH_STATE_COOKIE = "hub_google_oauth_state";

// Codes the frontend's LOGIN_ERRORS map (frontend/src/pages/LoginPage.tsx)
// knows how to render. Anything else falls back to "login_failed".
const RESPONSE_ERROR_CODES: Record<number, string> = {
  401: "google_auth_failed",
  403: "domain_not_allowed",
  404: "not_registered",
};

// Only ever an app-launch bounce-back (see apps-route.ts), never an arbitrary
// URL - this is what stands between "resume the app you came from" and an
// open redirect, so keep it narrow rather than accepting any relative path.
// crypto.randomUUID() never contains ':', so packing "nonce:redirect" into
// the one state cookie/param is unambiguous to split back apart - no need
// for a second cookie just to carry the redirect through Google's round trip.
function packState(redirect: string | null): string {
  const nonce = crypto.randomUUID();
  return redirect ? `${nonce}:${redirect}` : nonce;
}

function redirectFromState(state: string): string | null {
  const separator = state.indexOf(":");
  return separator === -1 ? null : sanitizeLaunchRedirect(state.slice(separator + 1));
}

// Lax, not Strict: the Google OAuth callback below redirects straight into
// a session-gated route (an app-launch bounce-back) as part of the SAME
// navigation chain that started at Google - a genuinely cross-site
// initiator. A Strict cookie set moments earlier in that same chain isn't
// sent on that next hop (only a fresh, independently-initiated navigation
// counts), so the launch 401s right after a successful login and only
// works after a manual reload. Lax still rides along on that top-level GET
// redirect while continuing to block the cookie from cross-site POST/embed
// requests - the CSRF vector Strict vs. Lax actually differs on.
function cookieOptions() {
  return sessionCookieOptions();
}

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/auth/google",
  };
}

// The shared session next to Hub's own. A failure here must not stop the person from signing in to the Hub.
async function startSharedSession(c: Context, user: SessionVariables["user"]) {
  try {
    const current = await prisma.userSession.findUnique({ where: { central_id: user.id } });
    await issueSharedSession(c, user, AppsService.accessTagsFor(user), current?.session_version ?? 0);
  } catch (error) {
    logger.error("Could not start the shared session:", error);
  }
}

async function hubAccessSummary(user: SessionVariables["user"]) {
  const access = await resolveHubAccess(user, Number(process.env.HUB_CENTRAL_ACCESS_CACHE_SECONDS || 30) * 1000);
  return {
    hubAccess:
      access.status === "granted" ? { role: access.role, permissions: access.permissions } : null,
  };
}

async function authUserResponse(user: SessionVariables["user"]) {
  return {
    ...user,
    unitId: getUserUnitId(user),
    unit_id: getUserUnitId(user),
    isAdmin: await isHubAdmin(user),
    // What Central says about this person's access to Hub, only when it is being checked.
    ...(hubAccessMode() === "off"
      ? {}
      : await hubAccessSummary(user)),
  };
}

async function sessionUserFromCookie(c: Context): Promise<SessionVariables["user"] | null> {
  const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
  const token = getCookie(c, cookieName);
  if (!token) return null;
  return (await verifySession(token))?.user ?? null;
}

function refreshDeps(): RefreshDeps {
  return {
    sessionVersionOf: async (centralId) =>
      (await prisma.userSession.findUnique({ where: { central_id: centralId } }))?.session_version ?? null,
    resolveIdentity: resolveCentralIdentityById,
    tagsFor: (user) => AppsService.accessTagsFor(user),
    currentHubUser: (c) => sessionUserFromCookie(c),
  };
}

export class AuthController {
  static async startGoogleLogin(c: Context) {
    const redirect = sanitizeLaunchRedirect(c.req.query("redirect"));
    const state = packState(redirect);

    setCookie(c, OAUTH_STATE_COOKIE, state, {
      ...oauthStateCookieOptions(),
      maxAge: 60 * 10,
    });

    return c.redirect(GoogleAuth.authUrl(state), 302);
  }

  static async loginWithGoogle(c: Context) {
    const { code } = await c.req.json<{ code: string }>();

    const { token, user } = await AuthService.loginWithGoogle(code);

    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    setCookie(c, cookieName, token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 8,
    });

    await startSharedSession(c, user);

    logger.info("User logged in:", user.email);
    await recordAuditLog({
      actor: user,
      action: "auth.login",
      entity: { type: "user", id: user.id },
      summary: `${user.email} logged in`,
      metadata: {
        method: "google",
        source: user.source,
        unit_id: getUserUnitId(user),
      },
    });

    return c.json({ data: await authUserResponse(user) });
  }

  static async googleCallback(c: Context) {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const expectedState = getCookie(c, OAUTH_STATE_COOKIE);

    deleteCookie(c, OAUTH_STATE_COOKIE, oauthStateCookieOptions());

    if (!code || !state || !expectedState || state !== expectedState) {
      return c.redirect(`${frontendOrigin()}/login?error=google_state`, 302);
    }

    const redirect = redirectFromState(state);

    let token: string;
    let user: SessionVariables["user"];
    try {
      ({ token, user } = await AuthService.loginWithGoogle(code));
    } catch (err) {
      logger.error("Google callback failed:", err);
      const errorCode =
        err instanceof ResponseError ? (err.code ?? RESPONSE_ERROR_CODES[err.status]) : undefined;
      return c.redirect(
        `${frontendOrigin()}/login?error=${errorCode ?? "login_failed"}`,
        302,
      );
    }

    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";

    setCookie(c, cookieName, token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 8,
    });

    await startSharedSession(c, user);

    logger.info("User logged in from Google callback:", user.email);
    await recordAuditLog({
      actor: user,
      action: "auth.login",
      entity: { type: "user", id: user.id },
      summary: `${user.email} logged in`,
      metadata: {
        method: "google_callback",
        source: user.source,
        unit_id: getUserUnitId(user),
        redirect: redirect ?? "/support-hub",
      },
    });

    return c.redirect(`${frontendOrigin()}${redirect ?? "/support-hub"}`, 302);
  }

  // See handleRefresh and handleRestore in lib/shared-session.ts.
  static refresh(c: Context) {
    return handleRefresh(c, refreshDeps());
  }

  static restore(c: Context) {
    return handleRestore(c, refreshDeps(), `${frontendOrigin()}/`);
  }

  static async me(c: Context<{ Variables: SessionVariables }>) {
    const user = c.var.user;
    return c.json({ data: await authUserResponse(user) });
  }

  // Hub's own sign-out button, called as an XHR from the Hub UI.
  static async logout(c: Context) {
    const user = await sessionUserFromCookie(c);
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    deleteCookie(c, cookieName, cookieOptions());
    await endSharedSession(c).catch((error) => logger.error("Could not end the shared session:", error));

    if (user) {
      logger.info("User logged out:", user.email);
      await revokeSessionsForUser(user.email, user.person_id);
      await recordAuditLog({
        actor: user,
        action: "auth.logout",
        entity: { type: "user", id: user.id },
        summary: `${user.email} logged out`,
        metadata: { surface: "hub" },
      });
    } else {
      logger.info("Logout requested without a valid Hub session");
    }

    return c.json({ data: "Logged out successfully" });
  }

  // Every satellite app's own local session is out of Hub's reach - a
  // different origin's cookie/localStorage that Hub's page can never touch
  // directly. The frontend loads each of these in a hidden iframe on logout
  // so signing out of Hub actually signs out of everything the person
  // opened, not just Hub itself. Static catalog data, no session required.
  static async logoutTargets(c: Context) {
    return c.json({ data: await AppsService.logoutTargets() });
  }

  // An application with its own session sends the browser here after it ended that session. Only that application
  // signs out: the Hub session and the other applications stay as they are. Signing out of the Hub is the way to
  // end all of them (POST /auth/logout). Here the browser is only sent back to where the application asked, or to
  // the Hub front page.
  static async logoutFromApp(c: Context) {
    const user = await sessionUserFromCookie(c);
    const target = (await resolveLogoutRedirect(c.req.query("redirect"))) || `${frontendOrigin()}/`;

    if (user) {
      logger.info("User signed out of a connected app:", user.email);
      await recordAuditLog({
        actor: user,
        action: "auth.logout",
        entity: { type: "user", id: user.id },
        summary: `${user.email} signed out of a connected app`,
        metadata: { surface: "connected_app", redirect_target: target },
      });
    }

    return c.redirect(target, 302);
  }
}
