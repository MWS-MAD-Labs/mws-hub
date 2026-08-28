import type { Context } from "hono";
import { getUserUnitId, getUserUnitName } from "../lib/admin-access";
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
}
