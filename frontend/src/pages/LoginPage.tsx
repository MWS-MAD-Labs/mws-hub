import { useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import LoginBackground from "@/mobile/Assets/image.png";
import { GoogleLoginButton } from "@/features/auth/components/GoogleLoginButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { isServerPath, sanitizeRedirectPath } from "@/lib/redirect-path";

const HOME_PATH = "/support-hub";

// launchSessionAuthMiddleware (apps-route.ts) sends people here with ?redirect=/apps/:appId/launch
// when they opened an app while signed out. After sign-in the launch has to continue. That path
// belongs to the Hub server, so it is opened with a real page load; the single page app would
// show an empty page for it (see lib/redirect-path.ts).

const LOGIN_ERRORS: Record<string, { title: string; description: string }> = {
  account_not_registered: {
    title: "Account not registered",
    description:
      "Your Google account has not been registered in the Central database yet.",
  },
  session_expired: {
    title: "Session ended",
    description: "Please sign in again before opening an app.",
  },
  google_state: {
    title: "Sign-in expired",
    description: "That sign-in link timed out. Please try again.",
  },
  google_auth_failed: {
    title: "Google sign-in failed",
    description: "We couldn't verify your Google account. Please try again.",
  },
  domain_not_allowed: {
    title: "Account not allowed",
    description: "Only MWS Google accounts can sign in to Hub.",
  },
  not_registered: {
    title: "Account not found",
    description: "This account isn't registered yet. Contact an admin for access.",
  },
  hub_access_denied: {
    title: "No access to Hub yet",
    description: "Your account is registered, but it doesn't have access to Hub. Ask a Super Admin to give you access.",
  },
  hub_use_missing: {
    title: "Your role can't use Hub",
    description: "Your account has access, but its role doesn't include Hub. Ask a Super Admin to add Hub access to your role.",
  },
  central_unavailable: {
    title: "Central isn't reachable",
    description: "We couldn't check your access right now. Please try again in a moment.",
  },
  login_failed: {
    title: "Couldn't sign you in",
    description: "Something went wrong on our end. Please try again in a moment.",
  },
};

// Hands the rest of the sign-in over to the server with a full page load.
function ContinueOnServer({ path }: { path: string }) {
  useEffect(() => {
    window.location.replace(path);
  }, [path]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-sm text-muted-foreground">
      Continuing to your app...
    </main>
  );
}

export default function LoginPage() {
  const { isAuthenticated, isSessionLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const shownErrorRef = useRef<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code || shownErrorRef.current === code) return;
    shownErrorRef.current = code;

    const notice = LOGIN_ERRORS[code];
    if (notice) {
      toast.error(notice.title, { description: notice.description });
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("error");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  if (isAuthenticated) {
    const redirect = sanitizeRedirectPath(searchParams.get("redirect"));
    if (redirect && isServerPath(redirect)) return <ContinueOnServer path={redirect} />;
    return <Navigate to={redirect || HOME_PATH} replace />;
  }

  const showAccountNotRegisteredError =
    searchParams.get("error") === "account_not_registered";

  return (
    <main className="relative isolate flex min-h-screen min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 text-foreground">
      <div
        aria-hidden
        className="absolute inset-[-4px] -z-10 scale-[1.02] bg-cover bg-center bg-no-repeat blur-[3px]"
        style={{ backgroundImage: `url(${LoginBackground})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-black/35 to-black/55"
      />

      <div className="w-full max-w-sm rounded-3xl border border-white/20 bg-card/95 p-7 shadow-2xl shadow-black/30 backdrop-blur-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <img
            src="/mws-hub-v2-192x192.png"
            alt=""
            width={72}
            height={72}
            className="mb-4 h-[72px] w-[72px] drop-shadow-md"
          />
          <h1 className="text-xl font-semibold tracking-tight">MWS Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your MWS Google account
          </p>
        </div>

        <GoogleLoginButton />

        {showAccountNotRegisteredError && (
          <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            Your account is not registered in the Central database yet. Please
            contact the administrator.
          </p>
        )}

        {isSessionLoading && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Checking session...
          </p>
        )}
      </div>

      <p className="mt-6 text-xs font-medium text-white/90 [text-shadow:0_1px_3px_rgb(0_0_0/0.6)]">
        Millennia World School
      </p>
    </main>
  );
}
