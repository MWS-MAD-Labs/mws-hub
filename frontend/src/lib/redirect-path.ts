// Paths the Hub server answers itself (the launch of an app, the code exchange, the auth
// endpoints). Inside the single page app nothing renders for them, so they need a real page load.
const SERVER_PATH = /^\/(apps|sso|auth)(\/|\?|$)/;

export function isServerPath(path: string): boolean {
  return SERVER_PATH.test(path);
}

// Only a same-origin relative path is accepted, so a query parameter cannot become an open redirect.
export function sanitizeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
