// An application's logout address is saved once, in Central. The two addresses the Hub needs are made from it:
// the page that clears the browser's session, and the call that ends a person's session from the server.
// Both live next to each other under /auth, so `/auth/logout` and `/auth/logout-silent` give the same pair.
const LOGOUT_SUFFIX = /\/auth\/logout(-silent)?\/?$/;

export type AppEndpoints = { silent: string; revoke: string };

export function appEndpoints(logoutUrl: string): AppEndpoints | null {
  let url: URL;
  try {
    url = new URL(logoutUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // Anything else is left alone: the Hub cannot tell what the application serves there.
  if (!LOGOUT_SUFFIX.test(url.pathname)) return null;
  const at = (path: string) => {
    const next = new URL(url.toString());
    next.pathname = url.pathname.replace(LOGOUT_SUFFIX, path);
    next.search = "";
    next.hash = "";
    return next.toString();
  };
  return { silent: at("/auth/logout-silent"), revoke: at("/auth/revoke-session") };
}
