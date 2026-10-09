import { apiRequest } from "@/lib/api";
import type { HubApplicationStatus } from "@/model/hub-model";

export type AdminApplicationStatus = Uppercase<HubApplicationStatus>;

export type AdminAccessSource = string;

export type AdminAccessRuleOption = {
  value: string;
  label: string;
  hint: string;
};

export type AdminAccessOptions = {
  base: AdminAccessRuleOption[];
  central: {
    units: AdminAccessRuleOption[];
    jobPositions: AdminAccessRuleOption[];
    jobLevels: AdminAccessRuleOption[];
  };
  centralRulePrefixes: AdminAccessRuleOption[];
};

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
  sso_logout_url: string | null;
  sso_central_entitlement_app_id: string | null;
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
  ssoLogoutUrl?: string | null;
  centralEntitlementAppId?: string | null;
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

export type AdminAuditLog = {
  id: string;
  actor_email: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  metadata: unknown | null;
  created_at: string;
};

export type AdminDashboardData = {
  message: string;
  unit: string;
  unitId: string | null;
};

export type AdminPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
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
      "/admin/api/catalog",
    );
    return response?.data ?? [];
  },

  async getApplication(id: string): Promise<AdminApplication> {
    const response = await apiRequest<{ data: AdminApplication }>(
      `/admin/api/catalog/${encodeURIComponent(id)}`,
    );
    return response!.data;
  },

  async createApplication(
    input: AdminApplicationInput,
  ): Promise<AdminApplication> {
    const response = await apiRequest<{ data: AdminApplication }>(
      "/admin/api/catalog",
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
      `/admin/api/catalog/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input },
    );
    return response!.data;
  },

  async deleteApplication(id: string): Promise<void> {
    await apiRequest(`/admin/api/catalog/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async accessOptions(): Promise<AdminAccessOptions> {
    const response = await apiRequest<{ data: AdminAccessOptions }>(
      "/admin/api/access-options",
    );
    return response!.data;
  },

  async listReports() {
    const response = await apiRequest<{ data: AdminReport[] }>(
      "/admin/api/reports",
    );
    return response?.data ?? [];
  },

  async listAccessRequests() {
    const response = await apiRequest<{ data: AdminAccessRequest[] }>(
      "/admin/api/access-requests",
    );
    return response?.data ?? [];
  },

  async listAuditLogs(query: { page?: number; pageSize?: number; q?: string; action?: string; dateFrom?: string; dateTo?: string } = {}) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.action) params.set("action", query.action);
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
    const suffix = params.size ? `?${params.toString()}` : "";
    const response = await apiRequest<{ data: AdminAuditLog[]; meta: { pagination: AdminPaginationMeta } }>(
      `/admin/api/audit-logs${suffix}`,
    );
    return {
      data: response?.data ?? [],
      pagination: response?.meta.pagination ?? {
        page: 1,
        pageSize: query.pageSize || 10,
        total: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    };
  },

  async updateReport(id: string, status: AdminReport["status"]) {
    await apiRequest(`/admin/api/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    });
  },

  async updateAccessRequest(id: string, status: AdminAccessRequest["status"]) {
    await apiRequest(`/admin/api/access-requests/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    });
  },
};
