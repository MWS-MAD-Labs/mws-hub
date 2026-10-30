import type { Context } from "hono";
import { ResponseError } from "../error/response-error";
import { resolveCentralIdentityById } from "../lib/central-client";
import { logger } from "../lib/logger";
import { recordAuditLog } from "../service/audit-log-service";
import { GptCodeAccessService } from "../service/gpt-code-access-service";
import { GptCodeGmailAccessService } from "../service/gpt-code-gmail-access-service";
import { gptCodeProvider } from "../service/gpt-code-gmail-service";
import type { SessionVariables } from "../type/hono-context";

const requestInFlight = new Set<string>();
const lastRequestAt = new Map<string, number>();
const REQUEST_COOLDOWN_MS = 5_000;

function noStore(c: Context) {
  c.header("Cache-Control", "private, no-store");
  c.header("Pragma", "no-cache");
}

async function freshUser(c: Context<{ Variables: SessionVariables }>) {
  const sessionUser = c.var.user;
  try {
    const user = await resolveCentralIdentityById(sessionUser.id, sessionUser.source);
    if (!user) throw new ResponseError(403, "Your Central account is no longer active.");
    c.set("user", user);
    return user;
  } catch (error) {
    if (error instanceof ResponseError) throw error;
    logger.error("Central lookup failed during GPT Code authorization:", error);
    throw new ResponseError(503, "Cannot verify your Central unit right now.");
  }
}

export class GptCodeUserController {
  static async account(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    const user = await freshUser(c);
    const assignment = gptCodeProvider() === "gmail"
      ? GptCodeGmailAccessService.assignmentFor(user)
      : await GptCodeAccessService.assignmentFor(user);
    return c.json({ data: assignment });
  }

  static async code(c: Context<{ Variables: SessionVariables }>) {
    noStore(c);
    const user = await freshUser(c);
    const limiterKey = user.person_id;
    const now = Date.now();
    const previous = lastRequestAt.get(limiterKey) ?? 0;

    if (requestInFlight.has(limiterKey) || now - previous < REQUEST_COOLDOWN_MS) {
      c.header("Retry-After", "5");
      throw new ResponseError(429, "Please wait a few seconds before checking again.");
    }

    requestInFlight.add(limiterKey);
    lastRequestAt.set(limiterKey, now);

    try {
      const provider = gptCodeProvider();
      const { assignment, result } = provider === "gmail"
        ? await GptCodeGmailAccessService.codeFor(user)
        : await GptCodeAccessService.codeFor(user);
      await recordAuditLog({
        actor: user,
        action: "gpt_code.fetch",
        entity: { type: "gpt_code_card", id: result.cardId },
        summary: `${user.email} fetched their unit's GPT login code`,
        // OTP, subject and account email are intentionally never persisted.
        metadata: {
          card_id: result.cardId,
          unit_id: assignment.unitId,
          unit_name: assignment.unitName,
          message_timestamp: result.timestamp,
          provider,
        },
      });

      return c.json({
        data: {
          cardId: result.cardId,
          code: result.code,
          timestamp: result.timestamp,
          accountEmail: assignment.email,
          unitName: assignment.unitName,
        },
      });
    } finally {
      requestInFlight.delete(limiterKey);
    }
  }
}

export function resetGptCodeRateLimitForTest() {
  requestInFlight.clear();
  lastRequestAt.clear();
}
