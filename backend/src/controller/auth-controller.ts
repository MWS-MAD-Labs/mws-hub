import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { AuthService } from "../service/auth-service";
import { GoogleAuth } from "../lib/google-auth";
import { ResponseError } from "../error/response-error";
import { resolveLogoutRedirect } from "../lib/logout-redirect";
import { frontendOrigin } from "../lib/frontend-origin";
import { logger } from "../lib/logger";
import { AppsService } from "../service/apps-service";
import { getUserUnitId } from "../lib/admin-access";
import type { SessionVariables } from "../type/hono-context";

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
const APP_LAUNCH_REDIRECT = /^\/apps\/[a-z0-9_-]+\/launch$/;

function sanitizeLaunchRedirect(raw: string | undefined | null): string | null {
  return raw && APP_LAUNCH_REDIRECT.test(raw) ? raw : null;
}

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

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict" as const,
    path: "/",
  };
}

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/auth/google",
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

    return c.json({ data: user });
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
    try {
      ({ token } = await AuthService.loginWithGoogle(code));
    } catch (err) {
      logger.error("Google callback failed:", err);
      const errorCode =
        err instanceof ResponseError ? RESPONSE_ERROR_CODES[err.status] : undefined;
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

    return c.redirect(`${frontendOrigin()}${redirect ?? "/support-hub"}`, 302);
  }

  static async me(c: Context<{ Variables: SessionVariables }>) {
    const user = c.var.user;
    return c.json({
      data: {
        ...user,
        unitId: getUserUnitId(user),
        unit_id: getUserUnitId(user),
      },
    });
  }

  // Hub's own sign-out button, called as an XHR from the Hub UI.
  static async logout(c: Context) {
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    deleteCookie(c, cookieName, cookieOptions());
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

  // Sign-out that starts inside a satellite app. The app clears its own
  // session and then sends the BROWSER here - it has to be the browser,
  // because Hub's session is a cookie on Hub's domain and no other server can
  // delete it. A back-channel call would leave the user still signed in here.
  //
  // Works because Hub and the apps share a registrable domain, which keeps
  // this a same-site navigation and lets the SameSite=Strict cookie through.
  // Put Hub on a different domain than the apps and this silently stops
  // clearing anything.
  static async logoutFromApp(c: Context) {
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    deleteCookie(c, cookieName, cookieOptions());

    const target =
      resolveLogoutRedirect(c.req.query("redirect")) ||
      `${frontendOrigin()}/login`;

    return c.redirect(target, 302);
  }
}
