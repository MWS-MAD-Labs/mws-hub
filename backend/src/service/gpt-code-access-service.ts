import { ResponseError } from "../error/response-error";
import * as adminAccess from "../lib/admin-access";
import { prisma } from "../lib/prisma";
import type { GptCodeTargetType } from "../generated/prisma/enums";
import type { HubUser } from "../type/central-type";
import { CentralDirectoryService, type CentralAccessRuleOptions } from "./central-directory-service";
import { GptCodeService, type GptCodeAccount, type GptCodeResult } from "./gpt-code-service";

// What a card can be offered to, as the API and admin screen spell it.
export type GptCodeTargetKind = "unit" | "job_level" | "job_position" | "building";

export type GptCodeTarget = { type: GptCodeTargetKind; id: string; name: string };

// One card's rules, as the admin screen edits them: all targets at once,
// with one active switch for the card.
export type GptCodeMapping = {
  cardId: string;
  isActive: boolean;
  targets: GptCodeTarget[];
  updatedAt: string;
};

export type GptCodeTargetOption = { id: string; label: string };

export type GptCodeAssignment = GptCodeAccount & {
  unitId: string;
  unitName: string;
  // Present when the person may pick between accounts: every account for a
  // Hub admin, or every matching account when more than one matches.
  accounts?: string[];
};

// What a caller may use: the assignment shown to them and, when they can
// pick, the accounts with card ids so a picked email is resolved server side.
type Resolved = {
  assignment: GptCodeAssignment;
  options: GptCodeAccount[] | null;
  viaAdmin: boolean;
};

const KIND_TO_TYPE: Record<GptCodeTargetKind, GptCodeTargetType> = {
  unit: "UNIT",
  job_level: "JOB_LEVEL",
  job_position: "JOB_POSITION",
  building: "BUILDING",
};

const TYPE_TO_KIND: Record<GptCodeTargetType, GptCodeTargetKind> = {
  UNIT: "unit",
  JOB_LEVEL: "job_level",
  JOB_POSITION: "job_position",
  BUILDING: "building",
};

const KIND_LABEL: Record<GptCodeTargetKind, string> = {
  unit: "unit",
  job_level: "job level",
  job_position: "job position",
  building: "building",
};

const isTargetKind = (value: unknown): value is GptCodeTargetKind =>
  typeof value === "string" && value in KIND_TO_TYPE;

type RuleRow = {
  card_id: string;
  target_type: GptCodeTargetType;
  target_id: string;
  target_name: string;
  is_active: boolean;
  updated_at: Date;
};

function toMappings(rows: RuleRow[]): GptCodeMapping[] {
  const byCard = new Map<string, GptCodeMapping>();
  for (const row of rows) {
    const current = byCard.get(row.card_id) ?? {
      cardId: row.card_id,
      isActive: row.is_active,
      targets: [],
      updatedAt: row.updated_at.toISOString(),
    };
    current.targets.push({
      type: TYPE_TO_KIND[row.target_type],
      id: row.target_id,
      name: row.target_name,
    });
    // Rules of a card are saved together, so any one row's flag is the card's.
    current.isActive = current.isActive && row.is_active;
    if (row.updated_at.toISOString() > current.updatedAt) {
      current.updatedAt = row.updated_at.toISOString();
    }
    byCard.set(row.card_id, current);
  }
  return [...byCard.values()].sort((a, b) => a.cardId.localeCompare(b.cardId));
}

// Central's choices per kind, by id only: a rule matches a Central id, so a
// name-only option (no id in Central) cannot be offered.
function optionsByKind(
  directory: CentralAccessRuleOptions,
): Record<GptCodeTargetKind, GptCodeTargetOption[]> {
  const pick = (options: { value: string; label: string }[], prefix: string) =>
    options
      .filter((option) => option.value.startsWith(prefix))
      .map((option) => ({ id: option.value.slice(prefix.length), label: option.label }));

  return {
    unit: pick(directory.units, "unit:"),
    job_level: pick(directory.jobLevels, "job-level:"),
    job_position: pick(directory.jobPositions, "job-position:"),
    building: pick(directory.buildings ?? [], "building:"),
  };
}

function stringField(user: HubUser, ...keys: string[]): string | null {
  const record = user as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

// The Central ids a person is matched by, read the same way unit_id is.
function targetsOf(user: HubUser): { target_type: GptCodeTargetType; target_id: string }[] {
  const ids: [GptCodeTargetType, string | null][] = [
    ["UNIT", adminAccess.getUserUnitId(user)],
    ["JOB_LEVEL", stringField(user, "job_level_id", "jobLevelId")],
    ["JOB_POSITION", stringField(user, "job_position_id", "jobPositionId")],
    ["BUILDING", stringField(user, "building_id", "buildingId")],
  ];
  return ids
    .filter((entry): entry is [GptCodeTargetType, string] => Boolean(entry[1]))
    .map(([target_type, target_id]) => ({ target_type, target_id }));
}

const byCardId = (a: GptCodeAccount, b: GptCodeAccount) => a.cardId.localeCompare(b.cardId);

export class GptCodeAccessService {
  static async listMappings(): Promise<GptCodeMapping[]> {
    const rows = await prisma.gptCodeAccessRule.findMany({
      orderBy: [{ card_id: "asc" }, { target_type: "asc" }, { target_name: "asc" }],
    });
    return toMappings(rows);
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
      targets: directory
        ? optionsByKind(directory)
        : { unit: [], job_level: [], job_position: [], building: [] },
      centralAvailable: Boolean(directory),
    };
  }

  // Replaces a card's whole rule set. Every target must be one Central
  // currently has, and its name is stored as Central spells it.
  static async setMapping(input: {
    cardId: string;
    targets: { type: unknown; id: unknown }[];
    isActive: boolean;
  }): Promise<GptCodeMapping> {
    const account = await GptCodeService.getAccount(input.cardId);

    const wanted = new Map<string, { type: GptCodeTargetKind; id: string }>();
    for (const target of input.targets) {
      if (!isTargetKind(target.type)) {
        throw new ResponseError(400, "Each target needs a type: unit, job_level, job_position or building.");
      }
      const id = typeof target.id === "string" ? target.id.trim() : "";
      if (!id) throw new ResponseError(400, "Each target needs a Central id.");
      wanted.set(`${target.type}:${id}`, { type: target.type, id });
    }
    if (wanted.size === 0) {
      throw new ResponseError(400, "Choose at least one unit, job level, job position or building.");
    }

    let directory: CentralAccessRuleOptions;
    try {
      directory = await CentralDirectoryService.accessRuleOptions();
    } catch {
      throw new ResponseError(503, "Central could not be loaded right now.");
    }
    const options = optionsByKind(directory);

    const data = [...wanted.values()].map(({ type, id }) => {
      const option = options[type].find((item) => item.id === id);
      if (!option) {
        throw new ResponseError(400, `That ${KIND_LABEL[type]} is not available in Central.`);
      }
      return {
        card_id: account.cardId,
        target_type: KIND_TO_TYPE[type],
        target_id: id,
        target_name: option.label,
        is_active: input.isActive,
      };
    });

    await prisma.$transaction([
      prisma.gptCodeAccessRule.deleteMany({ where: { card_id: account.cardId } }),
      prisma.gptCodeAccessRule.createMany({ data }),
    ]);

    const rows = await prisma.gptCodeAccessRule.findMany({
      where: { card_id: account.cardId },
      orderBy: [{ target_type: "asc" }, { target_name: "asc" }],
    });
    return toMappings(rows)[0];
  }

  static async deleteMapping(cardId: string): Promise<GptCodeMapping> {
    const account = await GptCodeService.getAccount(cardId);
    const rows = await prisma.gptCodeAccessRule.findMany({
      where: { card_id: account.cardId },
      orderBy: [{ target_type: "asc" }, { target_name: "asc" }],
    });
    if (rows.length === 0) throw new ResponseError(404, "GPT card mapping was not found.");

    await prisma.gptCodeAccessRule.deleteMany({ where: { card_id: account.cardId } });
    return toMappings(rows)[0];
  }

  // Admins (hub.admin in Central, i.e. MAD Labs) may use every GPT account.
  // Everyone else gets the accounts whose rules list their unit, job level,
  // job position or building. When Central cannot answer, isHubAdmin says
  // no, so this falls back to the rules rather than widening access.
  private static async resolve(user: HubUser): Promise<Resolved> {
    if (user.source === "student") {
      throw new ResponseError(403, "GPT Code is available only to staff.");
    }

    const unitId = adminAccess.getUserUnitId(user) ?? "";

    if (await adminAccess.isHubAdmin(user)) {
      const options = [...(await GptCodeService.listAccounts())].sort(byCardId);
      if (options.length === 0) {
        throw new ResponseError(503, "No GPT accounts are available right now.");
      }
      return {
        assignment: {
          ...options[0],
          unitId,
          unitName: adminAccess.getUserUnitName(user) ?? "",
          accounts: options.map((account) => account.email),
        },
        options,
        viaAdmin: true,
      };
    }

    const targets = targetsOf(user);
    if (targets.length === 0) {
      throw new ResponseError(
        403,
        "Your Central profile has no unit, job level, job position or building.",
      );
    }

    const rows = await prisma.gptCodeAccessRule.findMany({
      where: { is_active: true, OR: targets },
      orderBy: { card_id: "asc" },
    });
    const cardIds = [...new Set(rows.map((row) => row.card_id))].sort();
    if (cardIds.length === 0) {
      throw new ResponseError(
        403,
        "No active GPT account is assigned to you. Ask a Hub admin.",
      );
    }

    const unitName =
      adminAccess.getUserUnitName(user) ??
      rows.find((row) => row.target_type === "UNIT")?.target_name ??
      "";

    if (cardIds.length === 1) {
      const account = await GptCodeService.getAccount(cardIds[0]);
      return { assignment: { ...account, unitId, unitName }, options: null, viaAdmin: false };
    }

    const options = (await GptCodeService.listAccounts())
      .filter((account) => cardIds.includes(account.cardId))
      .sort(byCardId);
    if (options.length === 0) {
      throw new ResponseError(503, "No GPT accounts are available right now.");
    }
    return {
      assignment: {
        ...options[0],
        unitId,
        unitName,
        accounts: options.map((account) => account.email),
      },
      options,
      viaAdmin: false,
    };
  }

  static async assignmentFor(user: HubUser): Promise<GptCodeAssignment> {
    return (await this.resolve(user)).assignment;
  }

  // accountEmail is the caller's pick. It is checked here, never trusted:
  // it must be one of the accounts this person resolved to.
  static async codeFor(
    user: HubUser,
    accountEmail?: string,
  ): Promise<{
    assignment: GptCodeAssignment;
    result: GptCodeResult;
    viaAdmin: boolean;
  }> {
    const { assignment, options, viaAdmin } = await this.resolve(user);
    const wanted = accountEmail?.trim().toLowerCase();

    let chosen: GptCodeAssignment = assignment;
    if (wanted && wanted !== assignment.email.toLowerCase()) {
      const match = options?.find((account) => account.email.toLowerCase() === wanted);
      if (!match) {
        throw new ResponseError(
          403,
          options
            ? "That GPT account is not available."
            : "You can only use the GPT account assigned to you.",
        );
      }
      chosen = { ...assignment, ...match };
    }

    const result = await GptCodeService.getCode(chosen.cardId);
    return { assignment: chosen, result, viaAdmin };
  }
}
