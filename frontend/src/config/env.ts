// Config is read at runtime from /env.js, which the container writes on
// start, and falls back to Vite's build-time values for local dev. That is
// what lets one built image serve staging and production without a rebuild.
type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  typeof window !== "undefined" && (window as { __MWS_ENV__?: RuntimeEnv }).__MWS_ENV__
    ? (window as { __MWS_ENV__?: RuntimeEnv }).__MWS_ENV__!
    : {};

function readEnv(key: string): string {
  return runtimeEnv[key] || (import.meta.env[key] as string | undefined) || "";
}

export const env = {
  // Empty means "same origin" - in production nginx proxies the API next to
  // the app, so requests go to /auth and /apps with no host prefix.
  hubApiBaseUrl: readEnv("VITE_HUB_API_BASE_URL"),
  googleClientId: readEnv("VITE_GOOGLE_CLIENT_ID"),
};
