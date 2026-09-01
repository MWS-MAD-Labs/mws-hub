import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoaderCircle, LogIn } from "lucide-react";
import { env } from "@/config/env";

export function GoogleLoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [searchParams] = useSearchParams();

  function handleLogin() {
    setIsLoggingIn(true);
    // A satellite app (e.g. MTSS) that bounced here for auth passes back its
    // own launch URL as `redirect` - carry it through to Hub's backend so
    // /auth/google/callback can send the browser straight back to it instead
    // of always landing on Hub's own dashboard.
    const redirect = searchParams.get("redirect");
    const startUrl = new URL(
      `${env.hubApiBaseUrl}/auth/google/start`,
      window.location.origin,
    );
    if (redirect) startUrl.searchParams.set("redirect", redirect);
    window.location.assign(startUrl.toString());
  }

  return (
    <button
      type="button"
      disabled={isLoggingIn}
      onClick={handleLogin}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isLoggingIn ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
      Continue with Google
    </button>
  );
}
