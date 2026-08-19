import type { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { AuthService } from "../service/auth-service";
import type { SessionVariables } from "../type/hono-context";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict" as const,
    path: "/",
  };
}

export class AuthController {
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

  static async me(c: Context<{ Variables: SessionVariables }>) {
    return c.json({ data: c.var.user });
  }

  static async logout(c: Context) {
    const cookieName = process.env.SESSION_COOKIE_NAME || "hub_session";
    deleteCookie(c, cookieName, cookieOptions());
    return c.json({ data: "Logged out successfully" });
  }
}
