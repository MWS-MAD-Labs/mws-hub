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

  // Hub's session is a cookie, which unlike localStorage never fires a
  // cross-tab event this tab could react to - so a tab that's been open a
  // while has no passive way to learn its cookie was cleared elsewhere
  // (e.g. by signing out of a satellite app in another tab). Call this
  // right before anything that depends on still being signed in, so a
  // stale tab finds out before acting on wrong assumptions instead of
  // after.
  const refreshUser = useCallback(async () => {
    const currentUser = await authApi.currentUser();
    setUser(currentUser);
    return currentUser;
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
      refreshUser,
    }),
    [user, isSessionLoading, isLoggingIn, loginWithGoogle, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
