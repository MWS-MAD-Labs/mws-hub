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

export type AdminReport = {
  id: string;
  reporter_email: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
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

// What the dashboard shows: health of the Hub, launch activity and open reports. Built on the server from Central,
// the database and the audit trail.
export type AdminOverview = {
  generated_at: string;
  health: {
    status: "ok" | "warning" | "problem";
    checks: { id: string; label: string; status: "ok" | "warning" | "problem"; detail: string }[];
    apps: { id: string; name: string; address: string | null; status: "up" | "down" | "no_address"; detail: string }[];
  };
  activity: {
    launches7: number;
    launches30: number;
    failures30: Record<string, number>;
    apps: { id: string; name: string; launches7: number; launches30: number; failures30: number; last_launch_at: string | null }[];
    never_opened: { id: string; name: string }[];
  };
  reports: { open: number; by_app: { application_id: string; name: string; open: number }[] };
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

  async overview(): Promise<AdminOverview> {
    const response = await apiRequest<{ data: AdminOverview }>("/admin/api/overview");
    return response!.data;
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

};
