import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";
import { AuthContext } from "./authContext";
import { fanOutLogout } from "../utils/logoutFanOut";
import type { AuthUser } from "@/model/auth-model";

// Hub's own cross-tab signal, mirroring the pattern every satellite app
// already uses (see e.g. daily-checkin/mtss's useCrossTabAuthSync) - the
// cookie itself can't fire a cross-tab event, but a localStorage write can,
// so a tab that ends up signed out (its own explicit logout, or a fresh
// load after landing here via a satellite app's logout-relay trip) leaves
// a note every OTHER open Hub tab's own `storage` listener below picks up,
// instead of those tabs needing a manual reload to notice.
const AUTH_SIGNAL_KEY = "hub.auth_signal";

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

  // Leaves a note for sibling Hub tabs once this tab settles on "signed
  // out" - whether that's this tab's own explicit logout() below, or this
  // tab freshly loading Hub's front page after a satellite app's logout
  // flow routed it through here. A value that changes each time (not a
  // fixed string) is what actually fires the `storage` event below in
  // other tabs - writing the same value twice in a row would not.
  useEffect(() => {
    if (isSessionLoading || user) return;
    try {
      localStorage.setItem(AUTH_SIGNAL_KEY, String(Date.now()));
    } catch {
      // Private browsing / storage disabled - nothing to do, this is a
      // best-effort convenience, not a security boundary.
    }
  }, [isSessionLoading, user]);

  // The other half of the signal above: an OTHER Hub tab's own write
  // lands here as a `storage` event (never fires in the tab that made the
  // write itself), so this re-checks the actual session rather than just
  // trusting the signal blindly.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SIGNAL_KEY) return;
      authApi.currentUser().then(setUser);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
