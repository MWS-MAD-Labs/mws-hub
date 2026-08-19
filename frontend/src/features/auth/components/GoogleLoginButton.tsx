import { LoaderCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/config/env";
import { requestGoogleCode } from "@/lib/googleIdentity";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "@/lib/api";

export function GoogleLoginButton() {
  const { loginWithGoogle, isLoggingIn } = useAuth();

  async function handleLogin() {
    try {
      const code = await requestGoogleCode({
        clientId: env.googleClientId,
      });
      await loginWithGoogle(code);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Google login failed";
      toast.error(message);
    }
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
