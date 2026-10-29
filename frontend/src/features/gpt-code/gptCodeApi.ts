import { apiRequest } from "@/lib/api";

export type GptCodeAssignment = {
  cardId: string;
  email: string;
  unitId: string;
  unitName: string;
};

export type GptCodeResult = {
  cardId: string;
  code: string;
  timestamp: string;
  accountEmail: string;
  unitName: string;
};

export const gptCodeApi = {
  async assignment(): Promise<GptCodeAssignment> {
    const response = await apiRequest<{ data: GptCodeAssignment }>(
      "/api/gpt-code/account",
    );
    return response!.data;
  },

  async fetchCode(): Promise<GptCodeResult> {
    const response = await apiRequest<{ data: GptCodeResult }>(
      "/api/gpt-code/code",
      { method: "POST" },
    );
    return response!.data;
  },
};
