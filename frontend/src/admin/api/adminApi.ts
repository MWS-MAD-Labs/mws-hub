import { apiRequest } from "@/lib/api";
import type { HubApplicationStatus } from "@/model/hub-model";

export type AdminApplicationStatus = Uppercase<HubApplicationStatus>;

export type AdminAccessSource =
  | "employee"
  | "student"
  | "public"
  | "teacher"
  | "staff"
  | "principal"
  | "director"
  | "admin"
  | "resource"
  | "head-unit"
  | "mad-labs";

export type AdminApplication = {
  id: string;
  name: string;
  icon: string;
  description: string;
  audience: string;
  category: string;
  keywords: string[];
  href: string | null;
  external: boolean;
  status: AdminApplicationStatus;
  discoverable: boolean;
  allowed_sources: AdminAccessSource[];
  sso_app_id: string | null;
  sso_entry_url: string | null;
  sort_order: number;
};

export type AdminApplicationInput = {
  id?: string;
  name: string;
  icon?: string;
  description: string;
  audience: string;
  category: string;
  keywords?: string[];
  href?: string | null;
  external?: boolean;
  status?: Lowercase<AdminApplicationStatus>;
  discoverable?: boolean;
  allowedSources?: AdminAccessSource[];
  ssoAppId?: string | null;
  ssoEntryUrl?: string | null;
  sortOrder?: number;
};

export type AdminReport = {
  id: string;
  reporter_email: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  created_at: string;
  application: { id: string; name: string };
};

export type AdminAccessRequest = {
  id: string;
  requester_email: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  application: { id: string; name: string };
};

export type AdminDashboardData = {
  message: string;
  unit: string;
  unitId: string | null;
};

export const adminApi = {
  async dashboard(): Promise<AdminDashboardData> {
    const response = await apiRequest<{ data: AdminDashboardData }>(
      "/admin/dashboard-data",
    );
    return response!.data;
  },

  async listApplications(): Promise<AdminApplication[]> {
    const response = await apiRequest<{ data: AdminApplication[] }>(
      "/admin/applications",
    );
    return response?.data ?? [];
  },

  async createApplication(
    input: AdminApplicationInput,
  ): Promise<AdminApplication> {
    const response = await apiRequest<{ data: AdminApplication }>(
      "/admin/applications",
      {
        method: "POST",
        body: input,
      },
    );
    return response!.data;
  },

  async updateApplication(
    id: string,
    input: AdminApplicationInput,
  ): Promise<AdminApplication> {
    const response = await apiRequest<{ data: AdminApplication }>(
      `/admin/applications/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input },
    );
    return response!.data;
  },

  async deleteApplication(id: string): Promise<void> {
    await apiRequest(`/admin/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async listReports() {
    const response = await apiRequest<{ data: AdminReport[] }>(
      "/admin/reports",
    );
    return response?.data ?? [];
  },

  async listAccessRequests() {
    const response = await apiRequest<{ data: AdminAccessRequest[] }>(
      "/admin/access-requests",
    );
    return response?.data ?? [];
  },

  async updateReport(id: string, status: AdminReport["status"]) {
    await apiRequest(`/admin/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    });
  },

  async updateAccessRequest(id: string, status: AdminAccessRequest["status"]) {
    await apiRequest(`/admin/access-requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    });
  },
};
