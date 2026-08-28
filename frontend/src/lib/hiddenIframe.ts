// Shared by logout fan-out and silent SSO refresh: a satellite app's own
// session/storage lives on its own origin, unreachable from Hub's page
// directly. Loading a no-UI page from that origin in a hidden iframe lets
// its own JS run on its own origin and touch its own storage - the
// standard front-channel pattern for both "clear my session" (logout) and
// "refresh my session" (silent SSO re-auth) without a visible navigation.
export function loadHiddenIframe(url: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      iframe.remove();
      resolve();
    };

    // A cross-origin iframe's load event still fires even though its
    // content is inaccessible - that's enough signal that the page ran.
    // The timeout is the fallback for a target that's slow, unreachable, or
    // simply doesn't exist (not every satellite app supports this yet).
    const timer = setTimeout(finish, timeoutMs);
    iframe.onload = finish;
    iframe.onerror = finish;
    iframe.src = url;

    document.body.appendChild(iframe);
  });
}
