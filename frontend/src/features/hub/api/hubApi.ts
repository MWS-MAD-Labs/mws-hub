import { apiRequest } from "@/lib/api";
import type { HubApplication } from "@/model/hub-model";

export const hubApi = {
  // Already filtered server-side to what the signed-in person may open, so
  // there is nothing here to hide again in the client - an app they have no
  // access to never arrives in the first place.
  async listApplications(): Promise<HubApplication[]> {
    const response = await apiRequest<{ data: HubApplication[] }>("/apps");
    return response?.data ?? [];
  },
};
