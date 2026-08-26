import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { env } from "@/config/env";

export function GoogleLoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  function handleLogin() {
    setIsLoggingIn(true);
    window.location.assign(`${env.hubApiBaseUrl}/auth/google/start`);
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
