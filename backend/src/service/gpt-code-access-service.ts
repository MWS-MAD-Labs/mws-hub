import { ResponseError } from "../error/response-error";
import { prisma } from "../lib/prisma";
import type { HubUser } from "../type/central-type";
import { CentralDirectoryService } from "./central-directory-service";
import { GptCodeService, type GptCodeAccount, type GptCodeResult } from "./gpt-code-service";

export type GptCodeMapping = {
  id: string;
  unitId: string;
  unitName: string;
  cardId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GptCodeAssignment = GptCodeAccount & {
  unitId: string;
  unitName: string;
};

function toMapping(row: {
  id: string;
  unit_id: string;
  unit_name: string;
  card_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): GptCodeMapping {
  return {
    id: row.id,
    unitId: row.unit_id,
    unitName: row.unit_name,
    cardId: row.card_id,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function userUnitId(user: HubUser): string | null {
  if (user.unit_id) return user.unit_id;
  if ("unitId" in user && typeof user.unitId === "string") return user.unitId;
  return null;
}

async function centralUnit(unitId: string) {
  let options;
  try {
    options = await CentralDirectoryService.accessRuleOptions();
  } catch {
    throw new ResponseError(503, "Central units could not be loaded right now.");
  }

  return options.units.find((unit) => unit.value === `unit:${unitId}`) ?? null;
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002",
  );
}

export class GptCodeAccessService {
  static async listMappings(): Promise<GptCodeMapping[]> {
    const rows = await prisma.gptCodeUnitMapping.findMany({
      orderBy: { card_id: "asc" },
    });
    return rows.map(toMapping);
  }

  static async adminConfiguration() {
    const [accounts, mappings, directory] = await Promise.all([
      GptCodeService.listAccounts(),
      this.listMappings(),
      CentralDirectoryService.accessRuleOptions().catch(() => null),
    ]);

    return {
      accounts,
      mappings,
      units: (directory?.units ?? []).map((unit) => ({
        unitId: unit.value.slice("unit:".length),
        label: unit.label,
        hint: unit.hint,
      })),
      centralAvailable: Boolean(directory),
    };
  }

  static async setMapping(input: {
    cardId: string;
    unitId: string;
    isActive: boolean;
  }): Promise<GptCodeMapping> {
    const account = await GptCodeService.getAccount(input.cardId);
    const unitId = String(input.unitId || "").trim();
    if (!unitId) throw new ResponseError(400, "Central unit id is required.");

    const unit = await centralUnit(unitId);
    if (!unit) {
      throw new ResponseError(400, "That unit is not available in Central.");
    }

    const conflicting = await prisma.gptCodeUnitMapping.findFirst({
      where: {
        unit_id: unitId,
        NOT: { card_id: account.cardId },
      },
    });
    if (conflicting) {
      throw new ResponseError(
        409,
        `${unit.label} is already assigned to ${conflicting.card_id}.`,
      );
    }

    try {
      const row = await prisma.gptCodeUnitMapping.upsert({
        where: { card_id: account.cardId },
        create: {
          card_id: account.cardId,
          unit_id: unitId,
          unit_name: unit.label,
          is_active: input.isActive,
        },
        update: {
          unit_id: unitId,
          unit_name: unit.label,
          is_active: input.isActive,
        },
      });
      return toMapping(row);
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ResponseError(409, "That unit or GPT card is already assigned.");
      }
      throw error;
    }
  }

  static async deleteMapping(cardId: string): Promise<GptCodeMapping> {
    const account = await GptCodeService.getAccount(cardId);
    const existing = await prisma.gptCodeUnitMapping.findUnique({
      where: { card_id: account.cardId },
    });
    if (!existing) throw new ResponseError(404, "GPT card mapping was not found.");

    await prisma.gptCodeUnitMapping.delete({
      where: { card_id: account.cardId },
    });
    return toMapping(existing);
  }

  static async assignmentFor(user: HubUser): Promise<GptCodeAssignment> {
    if (user.source === "student") {
      throw new ResponseError(403, "GPT Code is available only to staff.");
    }

    const unitId = userUnitId(user);
    if (!unitId) {
      throw new ResponseError(403, "Your Central profile does not have a unit.");
    }

    const mapping = await prisma.gptCodeUnitMapping.findUnique({
      where: { unit_id: unitId },
    });
    if (!mapping || !mapping.is_active) {
      throw new ResponseError(
        403,
        "No active GPT account is assigned to your unit. Ask a Hub admin.",
      );
    }

    const account = await GptCodeService.getAccount(mapping.card_id);
    return {
      ...account,
      unitId: mapping.unit_id,
      unitName: mapping.unit_name,
    };
  }

  static async codeFor(user: HubUser): Promise<{
    assignment: GptCodeAssignment;
    result: GptCodeResult;
  }> {
    const assignment = await this.assignmentFor(user);
    const result = await GptCodeService.getCode(assignment.cardId);
    return { assignment, result };
  }
}
