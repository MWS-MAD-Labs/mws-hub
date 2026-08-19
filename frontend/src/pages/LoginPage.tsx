import { Navigate, useLocation } from "react-router-dom";
import Logo from "@/assets/logo.webp";
import { GoogleLoginButton } from "@/features/auth/components/GoogleLoginButton";
import { useAuth } from "@/features/auth/hooks/useAuth";

type LocationState = { from?: { pathname?: string } };

export default function LoginPage() {
  const location = useLocation();
  const { isAuthenticated, isSessionLoading } = useAuth();
  const targetPath = (location.state as LocationState)?.from?.pathname || "/support-hub";

  if (isAuthenticated) {
    return <Navigate to={targetPath} replace />;
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
