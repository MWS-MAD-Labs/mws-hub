import { apiRequest } from "@/lib/api";

export type GptCodeAssignment = {
  cardId: string;
  email: string;
  unitId: string;
  unitName: string;
  // Every account this person may pick from. Absent while the backend still
  // assigns exactly one account per unit; the page then shows `email` only.
  accounts?: string[];
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

  // The backend decides which accounts the person may use; accountEmail is
  // only a choice among them and is ignored while there is a single account.
  async fetchCode(accountEmail?: string): Promise<GptCodeResult> {
    const response = await apiRequest<{ data: GptCodeResult }>(
      "/api/gpt-code/code",
      {
        method: "POST",
        ...(accountEmail ? { body: { accountEmail } } : {}),
      },
    );
    return response!.data;
  },
};
