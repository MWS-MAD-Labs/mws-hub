import { apiRequest, ApiError } from "@/lib/api";
import type { AuthUser } from "@/model/auth-model";

export const authApi = {
  async currentUser(): Promise<AuthUser | null> {
    try {
      const response = await apiRequest<{ data: AuthUser }>("/auth/me");
      return response?.data ?? null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },

  async loginWithGoogle(code: string): Promise<AuthUser> {
    const response = await apiRequest<{ data: AuthUser }>("/auth/google", {
      method: "POST",
      body: { code },
    });
    return response!.data;
  },

  async logout(): Promise<void> {
    await apiRequest("/auth/logout", { method: "POST" });
  },

  // Each URL is a satellite app's own no-UI page that clears its local
  // session on load - the caller loads them in hidden iframes to fan out
  // Hub's logout to every app the person opened.
  async logoutTargets(): Promise<string[]> {
    const response = await apiRequest<{ data: string[] }>("/auth/logout-targets");
    return response?.data ?? [];
  },
};
