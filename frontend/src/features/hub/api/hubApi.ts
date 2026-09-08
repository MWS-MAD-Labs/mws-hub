import { apiRequest } from "@/lib/api";
import type { HubApplication, HubBirthday } from "@/model/hub-model";

export const hubApi = {
  // The server keeps policy details hidden, but discoverable locked apps still
  // arrive so users can request access from the card.
  async listApplications(): Promise<HubApplication[]> {
    const response = await apiRequest<{ data: HubApplication[] }>("/apps");
    return response?.data ?? [];
  },

  async listBirthdays(limit = 8): Promise<HubBirthday[]> {
    const response = await apiRequest<{ data: HubBirthday[] }>(
      `/apps/birthdays?limit=${limit}`,
    );
    return response?.data ?? [];
  },
};
