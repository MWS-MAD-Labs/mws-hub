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
    await authApi.logout();
    setUser(null);

    // Best-effort after Hub's own cookie is gone: slow/unreachable satellite
    // logout pages must not keep the Hub session alive through a refresh.
    try {
      const targets = await authApi.logoutTargets();
      await fanOutLogout(targets);
    } catch {
      // ignored - see above
    }
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
