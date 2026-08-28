import { useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Logo from "@/assets/logo.webp";
import { GoogleLoginButton } from "@/features/auth/components/GoogleLoginButton";
import { useAuth } from "@/features/auth/hooks/useAuth";

const HOME_PATH = "/support-hub";
const LOGIN_ERRORS: Record<string, { title: string; description: string }> = {
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
  login_failed: {
    title: "Couldn't sign you in",
    description: "Something went wrong on our end. Please try again in a moment.",
  },
};

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
    return <Navigate to={HOME_PATH} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <img src={Logo} alt="" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-sm font-semibold">MWS Hub</p>
            <p className="text-xs text-muted-foreground">Sign in with your MWS Google account</p>
          </div>
        </div>

        <GoogleLoginButton />

        {isSessionLoading && (
          <p className="mt-4 text-xs text-muted-foreground">Checking session...</p>
        )}
      </div>
    </main>
  );
}
