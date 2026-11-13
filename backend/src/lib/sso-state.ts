import { ResponseError } from "../error/response-error";

const STATE_PATTERN = /^[A-Za-z0-9._~-]{1,512}$/;
const APP_LAUNCH_PATH = /^\/apps\/[a-z0-9_-]+\/launch$/;
const OIDC_AUTHORIZE_PATH = "/sso/oidc/authorize";
// Exactly the parameters an OIDC authorization request may carry, each once.
// The values are checked again by the authorize endpoint itself; this only
// keeps the login redirect from becoming a way to reach anything else.
const OIDC_AUTHORIZE_PARAMS = new Set([
  "client_id",
  "redirect_uri",
  "response_type",
  "scope",
  "state",
  "nonce",
  "code_challenge",
  "code_challenge_method",
  "prompt",
]);
const OIDC_REDIRECT_MAX = 2048;

export function optionalSsoState(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  if (!STATE_PATTERN.test(raw)) {
    throw new ResponseError(400, "SSO state must be 1-512 URL-safe characters.");
  }
  return raw;
}

export function sanitizeLaunchRedirect(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw, "https://hub.invalid");
  } catch {
    return null;
  }

  if (url.origin !== "https://hub.invalid") return null;
  if (url.pathname === OIDC_AUTHORIZE_PATH) return sanitizeOidcAuthorize(url);
  if (!APP_LAUNCH_PATH.test(url.pathname)) return null;
  if (url.hash || [...url.searchParams.keys()].some((key) => key !== "state")) {
    return null;
  }

  const states = url.searchParams.getAll("state");
  if (states.length > 1) return null;
  try {
    if (states.length === 1) optionalSsoState(states[0]);
  } catch {
    return null;
  }

  return `${url.pathname}${url.search}`;
}

function sanitizeOidcAuthorize(url: URL): string | null {
  if (url.hash) return null;
  const keys = [...url.searchParams.keys()];
  if (keys.length === 0 || keys.some((key) => !OIDC_AUTHORIZE_PARAMS.has(key))) return null;
  if (new Set(keys).size !== keys.length) return null;
  const path = `${url.pathname}${url.search}`;
  return path.length <= OIDC_REDIRECT_MAX ? path : null;
}
