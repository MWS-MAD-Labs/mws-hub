import { apiRequest } from "@/lib/api";

export type AdminDashboardData = {
  message: string;
  unit: string;
  unitId: string | null;
};

export const adminApi = {
  async dashboard(): Promise<AdminDashboardData> {
    const response = await apiRequest<{ data: AdminDashboardData }>("/admin/dashboard-data");
    return response!.data;
  },
};
