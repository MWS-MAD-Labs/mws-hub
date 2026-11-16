// A Hub sign-in lasts a fixed 7 days from the moment of sign-in.
const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_DAYS = 7;
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;
// Fallback for HUB_REFRESH_TTL_SECONDS when the env value is invalid.
export const MIN_SESSION_SECONDS = SESSION_SECONDS;

export function sessionEndsAt(now: number = Date.now()): Date {
  return new Date(now + SESSION_DAYS * DAY_MS);
}

// Seconds from now until the session ends, for a cookie's maxAge.
export function sessionSecondsLeft(now: number = Date.now()): number {
  return Math.max(Math.floor((sessionEndsAt(now).getTime() - now) / 1000), 1);
}
