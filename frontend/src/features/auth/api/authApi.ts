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
};
