import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";
import { AuthContext } from "./authContext";
import { fanOutLogout } from "../utils/logoutFanOut";
import type { AuthUser } from "@/model/auth-model";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    authApi
      .currentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .finally(() => {
        if (!cancelled) setIsSessionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithGoogle = useCallback(async (code: string) => {
    setIsLoggingIn(true);
    try {
      const loggedInUser = await authApi.loginWithGoogle(code);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // Best-effort: fan out to every satellite app's own session first, but
    // never let that block or fail Hub's own logout below - a satellite
    // that's slow, unreachable, or doesn't support this yet must not leave
    // the person stuck still signed into Hub.
    try {
      const targets = await authApi.logoutTargets();
      await fanOutLogout(targets);
    } catch {
      // ignored - see above
    }

    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isSessionLoading,
      isLoggingIn,
      loginWithGoogle,
      logout,
    }),
    [user, isSessionLoading, isLoggingIn, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
