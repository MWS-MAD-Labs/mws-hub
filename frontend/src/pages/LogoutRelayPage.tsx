import { useEffect, useRef } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { fanOutLogout } from "@/features/auth/utils/logoutFanOut";

const DEFAULT_REDIRECT = "/login";
const REDIRECT_COOKIE = "hub_post_logout_redirect";

// Set by AuthController.logoutFromApp right before this page loads, and only
// ever by Hub's own server - the value already passed resolveLogoutRedirect
// there, so reading it back here carries none of the risk a raw ?redirect=
// query param would.
function readAndClearRedirectCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${REDIRECT_COOKIE}=([^;]*)`),
  );
  document.cookie = `${REDIRECT_COOKIE}=; Max-Age=0; path=/`;
  return match ? decodeURIComponent(match[1]) : null;
}

// Landed on when a satellite app's own "sign out" button sends the browser
// back through Hub. Hub's session cookie is already cleared server-side by
// the time this loads - what's still open is every OTHER app the person may
// have signed into, which only the browser can reach. Run the same hidden-
// iframe fan-out Hub's own "Sign out" button uses, then finish the trip.
export default function LogoutRelayPage() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const redirect = readAndClearRedirectCookie() || DEFAULT_REDIRECT;

    (async () => {
      try {
        const targets = await authApi.logoutTargets();
        await fanOutLogout(targets);
      } catch {
        // best-effort, same as Hub's own sign-out flow
      } finally {
        window.location.replace(redirect);
      }
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
      Signing you out...
    </main>
  );
}
