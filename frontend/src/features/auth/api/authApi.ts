import { apiRequest, ApiError } from "@/lib/api";
import type { AuthUser } from "@/model/auth-model";

export type AuthSession = {
  id: string;
  current: boolean;
  device_name: string;
  trusted: boolean;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  status: "active" | "revoked" | "expired";
};

export type SessionListResult = {
  sessions: AuthSession[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  counts: { active: number; history: number };
};

export const authApi = {
  async currentUser(): Promise<AuthUser | null> {
    try {
      const response = await apiRequest<{ data: AuthUser }>("/auth/me", {
        cache: "no-store",
      });
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

  async sessions(query: { status?: "active" | "history" | "all"; page?: number; pageSize?: number } = {}): Promise<SessionListResult> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    const response = await apiRequest<{
      data: AuthSession[];
      meta: { pagination: SessionListResult["pagination"]; counts: SessionListResult["counts"] };
    }>(`/auth/sessions${params.size ? `?${params}` : ""}`, { cache: "no-store" });
    return {
      sessions: response?.data ?? [],
      pagination: response?.meta.pagination ?? {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
        total: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
      counts: response?.meta.counts ?? { active: 0, history: 0 },
    };
  },

  async revokeSession(sessionId: string): Promise<void> {
    await apiRequest(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  },

  async logoutAll(): Promise<void> {
    await apiRequest("/auth/logout-all", { method: "POST" });
  },

  async setTrusted(sessionId: string, trusted: boolean): Promise<void> {
    await apiRequest(`/auth/sessions/${encodeURIComponent(sessionId)}/trust`, {
      method: trusted ? "POST" : "DELETE",
    });
  },

  // Each URL is a satellite app's own no-UI page that clears its local
  // session on load - the caller loads them in hidden iframes to fan out
  // Hub's logout to every app the person opened.
  async logoutTargets(): Promise<string[]> {
    const response = await apiRequest<{ data: string[] }>("/auth/logout-targets");
    return response?.data ?? [];
  },
};
