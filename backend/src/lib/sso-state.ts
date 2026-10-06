import { ResponseError } from "../error/response-error";

const STATE_PATTERN = /^[A-Za-z0-9._~-]{1,512}$/;
const APP_LAUNCH_PATH = /^\/apps\/[a-z0-9_-]+\/launch$/;

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

  if (url.origin !== "https://hub.invalid" || !APP_LAUNCH_PATH.test(url.pathname)) {
    return null;
  }
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
