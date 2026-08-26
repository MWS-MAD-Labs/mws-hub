import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { AuthService } from "../service/auth-service";
import { GoogleAuth } from "../lib/google-auth";
import { resolveLogoutRedirect } from "../lib/logout-redirect";
import { frontendOrigin } from "../lib/frontend-origin";
import type { SessionVariables } from "../type/hono-context";

const OAUTH_STATE_COOKIE = "hub_google_oauth_state";

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
    const state = crypto.randomUUID();

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

    const { token } = await AuthService.loginWithGoogle(code);
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";

    setCookie(c, cookieName, token, {
      ...cookieOptions(),
      maxAge: 60 * 60 * 8,
    });

    return c.redirect(`${frontendOrigin()}/support-hub`, 302);
  }

  static async me(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: c.var.user });
  }

  // Hub's own sign-out button, called as an XHR from the Hub UI.
  static async logout(c: Context) {
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    deleteCookie(c, cookieName, cookieOptions());
    return c.json({ data: "Logged out successfully" });
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
