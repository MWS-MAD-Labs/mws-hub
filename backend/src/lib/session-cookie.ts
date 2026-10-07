// Lax, not Strict: the Google OAuth callback redirects straight into a session-gated route as
// part of the same navigation chain that started at Google, and a Strict cookie set moments
// earlier in that chain is not sent on that next hop. Lax still blocks cross-site POST/embed.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
    path: "/",
  };
}

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || "hub_session";
}
