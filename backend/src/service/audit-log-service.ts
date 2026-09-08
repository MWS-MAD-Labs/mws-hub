import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import type { HubUser } from "../type/central-type";
import type { Prisma } from "../generated/prisma/client";

type AuditEntity = {
  type: string;
  id: string;
};

export type AuditLogInput = {
  actor: HubUser;
  action: string;
  entity: AuditEntity;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export function actorDisplayName(actor: HubUser): string | null {
  return actor.full_name || actor.nick_name || null;
}

export async function recordAuditLog(input: AuditLogInput) {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        actor_email: input.actor.email,
        actor_name: actorDisplayName(input.actor),
        action: input.action,
        entity_type: input.entity.type,
        entity_id: input.entity.id,
        summary: input.summary,
        metadata: input.metadata,
      },
    });

    logger.info("Audit event:", {
      action: input.action,
      actor: input.actor.email,
      entity: `${input.entity.type}:${input.entity.id}`,
      summary: input.summary,
    });

    return auditLog;
  } catch (error) {
    logger.error("Audit log write failed:", error);
    return null;
  }
}

export function listAuditLogs(take = 100) {
  return prisma.auditLog.findMany({
    orderBy: { created_at: "desc" },
    take,
  });
}
