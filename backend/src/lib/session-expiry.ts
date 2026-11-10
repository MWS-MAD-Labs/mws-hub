// A Hub sign-in lasts the working week: it ends when Friday ends in Jakarta
// (Saturday 00:00 WIB). Signing in on Monday or Wednesday is good until Friday
// night; signing in on the weekend is good until the next Friday night.
// Late on a Friday that would leave only minutes, so a sign-in always keeps at
// least MIN_SESSION_SECONDS.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta, no daylight saving
const DAY_MS = 24 * 60 * 60 * 1000;
const FRIDAY = 5;
export const MIN_SESSION_SECONDS = 8 * 60 * 60;

export function sessionEndsAt(now: number = Date.now()): Date {
  const wibNow = now + WIB_OFFSET_MS;
  const wibMidnight = wibNow - (wibNow % DAY_MS);
  const day = new Date(wibNow).getUTCDay(); // 0 Sunday ... 6 Saturday
  const daysUntilFriday = (FRIDAY - day + 7) % 7;
  // Midnight that starts the Saturday after that Friday, back in real (UTC) time.
  const weekEnd = wibMidnight + (daysUntilFriday + 1) * DAY_MS - WIB_OFFSET_MS;
  return new Date(Math.max(weekEnd, now + MIN_SESSION_SECONDS * 1000));
}

// Seconds from now until the session ends, for a cookie's maxAge.
export function sessionSecondsLeft(now: number = Date.now()): number {
  return Math.max(Math.floor((sessionEndsAt(now).getTime() - now) / 1000), 1);
}
