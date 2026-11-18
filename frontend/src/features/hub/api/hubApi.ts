import { apiRequest } from "@/lib/api";
import type { HubApplication, HubBirthday, HubTaxonomy } from "@/model/hub-model";

export const hubApi = {
  // The server keeps policy details hidden, but discoverable locked apps still
  // arrive so users can request access from the card.
  // `unavailable` is set when Central could not be asked for some cards: the list may be short, and the page says so.
  async listApplications(): Promise<{
    applications: HubApplication[];
    unavailable: { retryAfterSeconds: number | null } | null;
  }> {
    const response = await apiRequest<{
      data: HubApplication[];
      meta?: { central_unavailable?: boolean; retry_after_seconds?: number | null };
    }>("/apps");
    return {
      applications: response?.data ?? [],
      unavailable: response?.meta?.central_unavailable
        ? { retryAfterSeconds: response.meta.retry_after_seconds ?? null }
        : null,
    };
  },

  async taxonomy(): Promise<HubTaxonomy> {
    const response = await apiRequest<{ data: HubTaxonomy }>("/apps/taxonomy");
    return response?.data ?? { categories: [], scopes: [] };
  },

  async listBirthdays(limit = 8): Promise<HubBirthday[]> {
    const response = await apiRequest<{ data: HubBirthday[] }>(
      `/apps/birthdays?limit=${limit}`,
    );
    return response?.data ?? [];
  },
};
