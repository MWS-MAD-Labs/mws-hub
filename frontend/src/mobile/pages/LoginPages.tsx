import type { ReactNode } from "react";
import Logo from "@/assets/logo.webp";
import LoginBackground from "@/mobile/Assets/image.png";

type LoginPagesProps = {
  children: ReactNode;
  isSessionLoading: boolean;
  showAccountNotRegisteredError: boolean;
};

export default function LoginPages({
  children,
  isSessionLoading,
  showAccountNotRegisteredError,
}: LoginPagesProps) {
  return (
    <main className="relative flex min-h-screen min-h-dvh items-center justify-center overflow-hidden bg-background px-4 text-foreground sm:hidden">
      <div
        className="absolute inset-[-4px] scale-[1.02] bg-cover bg-center bg-no-repeat blur-[3px]"
        style={{ backgroundImage: `url(${LoginBackground})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/55" />

      <div className="relative w-full max-w-[21rem] translate-y-[9vh] rounded-2xl border border-white/30 bg-white/88 p-5 shadow-2xl shadow-black/20 backdrop-blur-md">
        <div className="mb-6 flex items-center gap-2.5">
          <img src={Logo} alt="" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-sm font-semibold">MWS Hub</p>
            <p className="text-xs text-muted-foreground">
              Sign in with your MWS Google account
            </p>
          </div>
        </div>

        {children}

        {showAccountNotRegisteredError && (
          <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
            Your account is not registered in the Central database yet. Please
            contact the administrator.
          </p>
        )}

        {isSessionLoading && (
          <p className="mt-4 text-xs text-muted-foreground">
            Checking session...
          </p>
        )}
      </div>
    </main>
  );
}
