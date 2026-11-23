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
import { sessionSecondsLeft } from "../lib/session-expiry";
import { AppsService } from "../service/apps-service";
import { revokeSessionForUser, revokeSessionsForUser } from "../lib/session-revocation";
import { recordAuditLog } from "../service/audit-log-service";
import { getUserUnitId, isHubAdmin } from "../lib/admin-access";
import { hubAccessMode, resolveHubAccess } from "../lib/hub-access-gate";
import type { SessionVariables } from "../type/hono-context";
import { sanitizeLaunchRedirect } from "../lib/sso-state";
import { endSharedSession, handleRefresh, handleRestore, issueSharedSession, revokeSharedSession, type RefreshDeps } from "../lib/shared-session";
import { prisma } from "../lib/prisma";
import { resolveCentralIdentityById } from "../lib/central-client";
import { deviceMetadata } from "../lib/device-session";

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
async function startSharedSession(
  c: Context,
  user: SessionVariables["user"],
  sessionId: string,
  sessionVersion: number,
) {
  try {
    await issueSharedSession(c, user, AppsService.accessTagsFor(user), sessionId, sessionVersion);
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
  if (user.source === "admin") {
    return {
      id: user.id,
      admin_no: user.admin_no,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
      unit_id: user.unit_id,
      job_position: user.job_position,
      job_position_id: user.job_position_id,
      job_level: user.job_level ?? null,
      job_level_id: user.job_level_id,
      building: user.building ?? null,
      building_id: user.building_id,
      education_level: user.education_level,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      type: "admin" as const,
      is_protected: user.is_protected,
      is_identifier_change_approver: user.is_identifier_change_approver,
      is_employee_identifier_change_approver:
        user.is_employee_identifier_change_approver,
      is_head_of_care: user.is_head_of_care,
      person_id: user.person_id,
    };
  }

  if (user.source === "employee" || user.source === "intern") {
    const { photo_url, ...userFields } = user;
    return {
      ...userFields,
      avatar_url: user.avatar_url ?? photo_url ?? null,
      unitId: getUserUnitId(user),
      unit_id: getUserUnitId(user),
      isAdmin: await isHubAdmin(user),
      ...(hubAccessMode() === "off"
        ? {}
        : await hubAccessSummary(user)),
    };
  }

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

async function sessionFromCookie(c: Context) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
  const token = getCookie(c, cookieName);
  if (!token) return null;
  return verifySession(token);
}

function requireMutationRequest(c: Context) {
  if (c.req.header("origin") !== frontendOrigin() || !c.req.header("x-requested-with")) {
    throw new ResponseError(403, "Origin not allowed.");
  }
}

function refreshDeps(): RefreshDeps {
  return {
    sessionVersionOf: async (centralId) =>
      (await prisma.userSession.findUnique({ where: { central_id: centralId } }))?.session_version ?? null,
    sessionActive: async (sessionId, centralId, accountVersion) => {
      const session = await prisma.loginSession.findUnique({ where: { id: sessionId } });
      return Boolean(
        session &&
        session.central_id === centralId &&
        session.account_version === accountVersion &&
        !session.revoked_at &&
        session.expires_at.getTime() > Date.now(),
      );
    },
    resolveIdentity: resolveCentralIdentityById,
    tagsFor: (user) => AppsService.accessTagsFor(user),
    currentHubSession: async (c) => {
      const session = await sessionFromCookie(c);
      return session
        ? { user: session.user, sessionId: session.sessionId, sessionVersion: session.sessionVersion }
        : null;
    },
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

    const { token, user, sessionId, sessionVersion } = await AuthService.loginWithGoogle(code, deviceMetadata(c));

    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    setCookie(c, cookieName, token, {
      ...cookieOptions(),
      maxAge: sessionSecondsLeft(),
    });

    await startSharedSession(c, user, sessionId, sessionVersion);

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
        session_id: sessionId,
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
    let sessionId: string;
    let sessionVersion: number;
    try {
      ({ token, user, sessionId, sessionVersion } = await AuthService.loginWithGoogle(code, deviceMetadata(c)));
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
      maxAge: sessionSecondsLeft(),
    });

    await startSharedSession(c, user, sessionId, sessionVersion);

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
        session_id: sessionId,
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

  static async sessions(c: Context<{ Variables: SessionVariables }>) {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query("pageSize")) || 20));
    const requestedStatus = c.req.query("status");
    const status = requestedStatus === "history" || requestedStatus === "all" ? requestedStatus : "active";
    const now = new Date();
    const currentId = c.var.session.sessionId;
    const activeWhere = { central_id: c.var.user.id, revoked_at: null, expires_at: { gt: now } };
    const historyWhere = {
      central_id: c.var.user.id,
      OR: [{ revoked_at: { not: null } }, { expires_at: { lte: now } }],
    };
    const where = status === "active" ? activeWhere : status === "history" ? historyWhere : { central_id: c.var.user.id };
    const [sessions, total, activeCount, historyCount] = await prisma.$transaction([
      prisma.loginSession.findMany({
        where,
        orderBy: [{ last_seen_at: "desc" }, { created_at: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.loginSession.count({ where }),
      prisma.loginSession.count({ where: activeWhere }),
      prisma.loginSession.count({ where: historyWhere }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return c.json({
      data: sessions.map((session) => ({
        id: session.id,
        current: session.id === currentId,
        device_name: session.device_name || "Unknown device",
        trusted: Boolean(session.trusted_at),
        created_at: session.created_at,
        last_seen_at: session.last_seen_at,
        expires_at: session.expires_at,
        revoked_at: session.revoked_at,
        status: session.revoked_at ? "revoked" : session.expires_at.getTime() <= now.getTime() ? "expired" : "active",
      })),
      meta: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
        counts: { active: activeCount, history: historyCount },
      },
    });
  }

  static async revokeSession(c: Context<{ Variables: SessionVariables }>) {
    requireMutationRequest(c);
    const targetId = c.req.param("sessionId");
    const target = await prisma.loginSession.findFirst({
      where: { id: targetId, central_id: c.var.user.id },
    });
    if (!target) throw new ResponseError(404, "Session not found.");

    if (!target.revoked_at) {
      await prisma.loginSession.update({
        where: { id: target.id },
        data: { revoked_at: new Date(), revoked_reason: "user_revoked" },
      });
      await revokeSharedSession(target.id);
      await revokeSessionForUser(c.var.user.email, c.var.user.person_id, target.id);
      await recordAuditLog({
        actor: c.var.user,
        action: "auth.session_revoked",
        entity: { type: "session", id: target.id },
        summary: `${c.var.user.email} revoked a device session`,
        metadata: { session_id: target.id, current: target.id === c.var.session.sessionId },
      });
    }

    if (target.id === c.var.session.sessionId) {
      deleteCookie(c, process.env.SESSION_COOKIE_NAME || "hub_session", cookieOptions());
      await endSharedSession(c).catch((error) => logger.error("Could not end the shared session:", error));
    }
    return c.json({ data: "Session revoked" });
  }

  static async trustSession(c: Context<{ Variables: SessionVariables }>) {
    requireMutationRequest(c);
    const targetId = c.req.param("sessionId");
    if (targetId !== c.var.session.sessionId) {
      throw new ResponseError(403, "Only the current device can be trusted.");
    }
    await prisma.loginSession.updateMany({
      where: { id: targetId, central_id: c.var.user.id, revoked_at: null },
      data: { trusted_at: new Date() },
    });
    await recordAuditLog({
      actor: c.var.user,
      action: "auth.device_trusted",
      entity: { type: "session", id: targetId },
      summary: `${c.var.user.email} trusted the current device`,
      metadata: { session_id: targetId },
    });
    return c.json({ data: "Device trusted" });
  }

  static async untrustSession(c: Context<{ Variables: SessionVariables }>) {
    requireMutationRequest(c);
    const targetId = c.req.param("sessionId");
    if (targetId !== c.var.session.sessionId) {
      throw new ResponseError(403, "Only the current device can change its trust status.");
    }
    await prisma.loginSession.updateMany({
      where: { id: targetId, central_id: c.var.user.id, revoked_at: null },
      data: { trusted_at: null },
    });
    await recordAuditLog({
      actor: c.var.user,
      action: "auth.device_untrusted",
      entity: { type: "session", id: targetId },
      summary: `${c.var.user.email} removed trust from the current device`,
      metadata: { session_id: targetId },
    });
    return c.json({ data: "Device trust removed" });
  }

  static async logoutAll(c: Context<{ Variables: SessionVariables }>) {
    requireMutationRequest(c);
    const now = new Date();
    await prisma.$transaction([
      prisma.userSession.update({
        where: { central_id: c.var.user.id },
        data: { session_version: { increment: 1 } },
      }),
      prisma.loginSession.updateMany({
        where: { central_id: c.var.user.id, revoked_at: null },
        data: { revoked_at: now, revoked_reason: "logout_all" },
      }),
      prisma.refreshToken.updateMany({
        where: { central_id: c.var.user.id, revoked_at: null },
        data: { revoked_at: now },
      }),
    ]);
    deleteCookie(c, process.env.SESSION_COOKIE_NAME || "hub_session", cookieOptions());
    await endSharedSession(c).catch((error) => logger.error("Could not end the shared session:", error));
    await revokeSessionsForUser(c.var.user.email, c.var.user.person_id);
    await recordAuditLog({
      actor: c.var.user,
      action: "auth.logout_all",
      entity: { type: "user", id: c.var.user.id },
      summary: `${c.var.user.email} signed out all devices`,
      metadata: { session_id: c.var.session.sessionId },
    });
    return c.json({ data: "All sessions ended" });
  }

  // Hub's own sign-out button, called as an XHR from the Hub UI.
  static async logout(c: Context) {
    requireMutationRequest(c);
    const session = await sessionFromCookie(c);
    const user = session?.user ?? null;
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    deleteCookie(c, cookieName, cookieOptions());
    await endSharedSession(c).catch((error) => logger.error("Could not end the shared session:", error));

    if (user && session) {
      await prisma.loginSession.updateMany({
        where: { id: session.sessionId, central_id: user.id, revoked_at: null },
        data: { revoked_at: new Date(), revoked_reason: "user_logout" },
      });
      logger.info("User logged out:", user.email);
      await revokeSessionForUser(user.email, user.person_id, session.sessionId);
      await recordAuditLog({
        actor: user,
        action: "auth.logout",
        entity: { type: "user", id: user.id },
        summary: `${user.email} logged out`,
        metadata: { surface: "hub", session_id: session.sessionId },
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
    const user = (await sessionFromCookie(c))?.user ?? null;
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
