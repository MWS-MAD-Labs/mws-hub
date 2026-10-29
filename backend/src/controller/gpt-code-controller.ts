import type { Context } from "hono";
import { ResponseError } from "../error/response-error";
import { recordAuditLog } from "../service/audit-log-service";
import { GptCodeAccessService } from "../service/gpt-code-access-service";
import { GptCodeService } from "../service/gpt-code-service";
import type { SessionVariables } from "../type/hono-context";

function cardId(c: Context): string {
  const id = c.req.param("cardId");
  if (!id) throw new ResponseError(400, "GPT card id is required.");
  return id;
}

function noStore(c: Context) {
  c.header("Cache-Control", "private, no-store");
  c.header("Pragma", "no-cache");
}

export class GptCodeController {
  static async configuration(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    return c.json({ data: await GptCodeAccessService.adminConfiguration() });
  }

  static async accounts(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    return c.json({ data: await GptCodeService.listAccounts() });
  }

  static async account(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    return c.json({ data: await GptCodeService.getAccount(cardId(c)) });
  }

  static async code(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    const result = await GptCodeService.getCode(cardId(c));

    await recordAuditLog({
      actor: c.var.user,
      action: "gpt_code.fetch",
      entity: { type: "gpt_code_card", id: result.cardId },
      summary: `${c.var.user.email} fetched a GPT login code for ${result.cardId}`,
      // Never put the OTP, message subject or account email in the audit log.
      metadata: {
        card_id: result.cardId,
        message_timestamp: result.timestamp,
      },
    });

    return c.json({ data: result });
  }

  static async setMapping(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    const body = await c.req.json<{ unitId?: unknown; isActive?: unknown }>();
    const mapping = await GptCodeAccessService.setMapping({
      cardId: cardId(c),
      unitId: typeof body.unitId === "string" ? body.unitId : "",
      isActive: body.isActive !== false,
    });

    await recordAuditLog({
      actor: c.var.user,
      action: "gpt_code.mapping_update",
      entity: { type: "gpt_code_card", id: mapping.cardId },
      summary: `Assigned ${mapping.cardId} to ${mapping.unitName}`,
      metadata: {
        card_id: mapping.cardId,
        unit_id: mapping.unitId,
        unit_name: mapping.unitName,
        is_active: mapping.isActive,
      },
    });

    return c.json({ data: mapping });
  }

  static async deleteMapping(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    const mapping = await GptCodeAccessService.deleteMapping(cardId(c));

    await recordAuditLog({
      actor: c.var.user,
      action: "gpt_code.mapping_delete",
      entity: { type: "gpt_code_card", id: mapping.cardId },
      summary: `Removed ${mapping.cardId} from ${mapping.unitName}`,
      metadata: {
        card_id: mapping.cardId,
        unit_id: mapping.unitId,
        unit_name: mapping.unitName,
      },
    });

    return c.body(null, 204);
  }
}
