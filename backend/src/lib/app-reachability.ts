// Before sending someone to an application, ask whether it answers at all. Any HTTP answer (even 401 or 404) means it
// is up. Only a network failure (connection refused, no DNS, no answer in time) means it is not, and sending the person
// there would end on a browser error page. The answer is kept for a few seconds so repeated clicks stay quick.
const TIMEOUT_MS = 2500;
const KEEP_MS = 15_000;

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const known = new Map<string, { until: number; up: boolean }>();

export function forgetReachability() {
  known.clear();
}

export async function isAppReachable(
  url: string,
  options: { fetcher?: Fetch; now?: () => number; timeoutMs?: number } = {},
): Promise<boolean> {
  const now = options.now ?? Date.now;
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    // Not an address we can probe: do not block on it.
    return true;
  }
  const cached = known.get(origin);
  if (cached && cached.until > now()) return cached.up;

  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  let up = true;
  try {
    await fetcher(origin, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
    });
  } catch {
    up = false;
  }
  known.set(origin, { until: now() + KEEP_MS, up });
  return up;
}
