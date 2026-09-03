const REQUEST_TYPE = "mws-hub-auth-probe";
const REPLY_TYPE = "mws-hub-auth-probe-reply";

// After a hidden-iframe silent refresh finishes, the iframe itself always
// believes it succeeded - it wrote a token to *some* localStorage. Whether
// that write actually reached the tab we already have open is a different
// question: modern browsers partition a third-party iframe's storage by
// top-level site, so the iframe (embedded in Hub's page) and the real tab
// (its own top-level browsing context) can end up looking at two different
// storage buckets for the exact same origin. The iframe has no way to know
// this happened - it never sees an error.
//
// So instead of trusting the iframe, ask the tab we actually care about,
// directly. `target` is a real window reference (from the window.open name
// reuse that found this tab in the first place), so postMessage reaches it
// regardless of storage partitioning - postMessage isn't storage, it's a
// message straight into that window's own JS, which reads its own
// unpartitioned localStorage and answers honestly.
export function probeAuthenticated(target: Window, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (authenticated: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(authenticated);
    };

    const onMessage = (event: MessageEvent) => {
      // Only trust a reply from the exact window we asked - not origin,
      // since `target` may still be mid-navigation through the SSO chain
      // and its origin at reply time isn't fixed to compare against.
      if (event.source !== target) return;
      if (event.data?.type !== REPLY_TYPE) return;
      finish(Boolean(event.data.authenticated));
    };

    // No reply within the window means either the app doesn't answer this
    // probe (an older cached bundle) or something's genuinely stuck -
    // either way, false is the safe default: it drives the caller to fall
    // back to a real navigation rather than silently doing nothing.
    const timer = setTimeout(() => finish(false), timeoutMs);
    window.addEventListener("message", onMessage);

    // No secret payload here, so a wildcard target origin is fine - same
    // reasoning as logout-silent being loadable by anyone who has the URL.
    target.postMessage({ type: REQUEST_TYPE }, "*");
  });
}

export const AUTH_PROBE_REQUEST_TYPE = REQUEST_TYPE;
export const AUTH_PROBE_REPLY_TYPE = REPLY_TYPE;
