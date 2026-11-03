import { ResponseError } from "../error/response-error";
import type { HubUser } from "../type/central-type";
import { GptCodeGmailService } from "./gpt-code-gmail-service";

function unitId(user: HubUser): string {
  if (user.unit_id) return user.unit_id;
  if ("unitId" in user && typeof user.unitId === "string" && user.unitId) return user.unitId;
  return "gmail-test";
}

function unitName(user: HubUser): string {
  if ("unit" in user) {
    if (typeof user.unit === "string" && user.unit.trim()) return user.unit;
    if (user.unit && typeof user.unit === "object" && user.unit.name) return user.unit.name;
  }
  return "Gmail testing";
}

export class GptCodeGmailAccessService {
  static assignmentFor(user: HubUser) {
    const account = GptCodeGmailService.account();
    if (user.email.trim().toLowerCase() !== account.email) {
      throw new ResponseError(
        403,
        "This Gmail testing phase is restricted to the configured mailbox owner.",
      );
    }

    return {
      ...account,
      unitId: unitId(user),
      unitName: unitName(user),
    };
  }

  static async codeFor(user: HubUser) {
    const assignment = this.assignmentFor(user);
    const result = await GptCodeGmailService.getCode();
    return { assignment, result: { ...result, cardId: assignment.cardId } };
  }
}
