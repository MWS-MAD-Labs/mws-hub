import type { Context } from "hono";
import { BASE_ACCESS_RULE_OPTIONS, CENTRAL_RULE_PREFIXES } from "../lib/access-rules";
import { getUserUnitId, getUserUnitName } from "../lib/admin-access";
import { ResponseError } from "../error/response-error";
import { CentralDirectoryService } from "../service/central-directory-service";
import type { SessionVariables } from "../type/hono-context";

export class AdminController {
  static async dashboard(c: Context<{ Variables: SessionVariables }>) {
    const user = c.var.user;
    const unit = getUserUnitName(user) || "MAD Labs";

    return c.json({
      data: {
        message: `Halo, Saya admin dari ${unit}`,
        unit,
        unitId: getUserUnitId(user),
      },
    });
  }

  static async accessOptions(c: Context<{ Variables: SessionVariables }>) {
    let central;
    try {
      central = await CentralDirectoryService.accessRuleOptions();
    } catch {
      throw new ResponseError(
        503,
        "Central directory could not be loaded. Check CENTRAL_API_BASE_URL and CENTRAL_API_TOKEN.",
      );
    }

    return c.json({
      data: {
        base: BASE_ACCESS_RULE_OPTIONS,
        central,
        centralRulePrefixes: CENTRAL_RULE_PREFIXES,
      },
    });
  }
}
