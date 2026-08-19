import { createContext } from "react";
import type { AuthUser } from "@/model/auth-model";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  isLoggingIn: boolean;
  loginWithGoogle: (code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
