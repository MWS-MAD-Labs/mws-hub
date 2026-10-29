import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { HubUser } from "../type/central-type";

type MappingRow = {
  id: string;
  unit_id: string;
  unit_name: string;
  card_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const rows: MappingRow[] = [];

mock.module("../lib/prisma", () => ({
  prisma: {
    gptCodeUnitMapping: {
      findMany: async () => [...rows].sort((a, b) => a.card_id.localeCompare(b.card_id)),
      findUnique: async ({ where }: { where: { unit_id?: string; card_id?: string } }) =>
        rows.find((row) =>
          where.unit_id ? row.unit_id === where.unit_id : row.card_id === where.card_id,
        ) ?? null,
      findFirst: async ({ where }: {
        where: { unit_id: string; NOT?: { card_id?: string } };
      }) => rows.find((row) =>
        row.unit_id === where.unit_id && row.card_id !== where.NOT?.card_id,
      ) ?? null,
      upsert: async ({ where, create, update }: {
        where: { card_id: string };
        create: Omit<MappingRow, "id" | "created_at" | "updated_at">;
        update: Partial<MappingRow>;
      }) => {
        const existing = rows.find((row) => row.card_id === where.card_id);
        if (existing) {
          Object.assign(existing, update, { updated_at: new Date("2026-10-29T01:00:00Z") });
          return existing;
        }
        const row: MappingRow = {
          id: `mapping-${rows.length + 1}`,
          ...create,
          created_at: new Date("2026-10-29T00:00:00Z"),
          updated_at: new Date("2026-10-29T00:00:00Z"),
        };
        rows.push(row);
        return row;
      },
      delete: async ({ where }: { where: { card_id: string } }) => {
        const index = rows.findIndex((row) => row.card_id === where.card_id);
        return rows.splice(index, 1)[0];
      },
    },
  },
}));

const { CentralDirectoryService } = await import("../service/central-directory-service");
const { GptCodeService } = await import("../service/gpt-code-service");
const { GptCodeAccessService } = await import("../service/gpt-code-access-service");

function employee(unitId = "unit-directorate"): HubUser {
  return {
    source: "employee",
    id: "employee-1",
    person_id: "person-1",
    employee_id: "E001",
    full_name: "Directorate User",
    nick_name: null,
    email: "directorate@millennia21.id",
    photo_url: null,
    unit: "Directorate",
    unit_id: unitId,
    unitId,
    job_position: null,
    job_level: null,
    status: "ACTIVE",
    employment_type: null,
  };
}

function student(): HubUser {
  return {
    source: "student",
    id: "student-1",
    person_id: "person-2",
    nis: "10001",
    nisn: null,
    full_name: "Student User",
    nick_name: null,
    email: "student@millennia21.id",
    status: "ACTIVE",
    current_grade: "10",
    current_class: "A",
    unit_id: "unit-directorate",
  };
}

function addMapping(overrides: Partial<MappingRow> = {}) {
  rows.push({
    id: "mapping-1",
    unit_id: "unit-directorate",
    unit_name: "Directorate",
    card_id: "A5",
    is_active: true,
    created_at: new Date("2026-10-29T00:00:00Z"),
    updated_at: new Date("2026-10-29T00:00:00Z"),
    ...overrides,
  });
}

beforeEach(() => {
  rows.length = 0;
});

afterEach(() => {
  mock.restore();
});

describe("GptCodeAccessService", () => {
  it("resolves only the GPT account mapped to the employee's current unit", async () => {
    addMapping();
    addMapping({ id: "mapping-2", unit_id: "unit-elementary", unit_name: "Elementary", card_id: "A2" });
    const account = spyOn(GptCodeService, "getAccount").mockResolvedValue({
      cardId: "A5",
      email: "ai5@millennia21.id",
    });

    await expect(GptCodeAccessService.assignmentFor(employee())).resolves.toEqual({
      cardId: "A5",
      email: "ai5@millennia21.id",
      unitId: "unit-directorate",
      unitName: "Directorate",
    });
    expect(account).toHaveBeenCalledTimes(1);
    expect(account).toHaveBeenCalledWith("A5");
  });

  it("refuses staff without an active unit mapping", async () => {
    addMapping({ is_active: false });
    await expect(GptCodeAccessService.assignmentFor(employee())).rejects.toMatchObject({
      status: 403,
    });
    await expect(GptCodeAccessService.assignmentFor(employee("unit-elementary"))).rejects.toMatchObject({
      status: 403,
    });
  });

  it("refuses students even when their unit has a mapping", async () => {
    addMapping();
    await expect(GptCodeAccessService.assignmentFor(student())).rejects.toMatchObject({
      status: 403,
    });
  });

  it("fetches a code only after resolving the caller's unit assignment", async () => {
    addMapping();
    spyOn(GptCodeService, "getAccount").mockResolvedValue({
      cardId: "A5",
      email: "ai5@millennia21.id",
    });
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue({
      cardId: "A5",
      code: "123456",
      timestamp: "29 Oct 2026, 10:00:00",
      subject: "Your ChatGPT code",
    });

    const response = await GptCodeAccessService.codeFor(employee());
    expect(response.result.code).toBe("123456");
    expect(fetchCode).toHaveBeenCalledWith("A5");
  });

  it("stores the authoritative Central unit name when an admin maps a card", async () => {
    spyOn(GptCodeService, "getAccount").mockResolvedValue({
      cardId: "A1",
      email: "ai1@millennia21.id",
    });
    spyOn(CentralDirectoryService, "accessRuleOptions").mockResolvedValue({
      units: [{ value: "unit:unit-elementary", label: "Elementary", hint: "Central unit" }],
      jobPositions: [],
      jobLevels: [],
    });

    await expect(GptCodeAccessService.setMapping({
      cardId: "A1",
      unitId: "unit-elementary",
      isActive: true,
    })).resolves.toMatchObject({
      cardId: "A1",
      unitId: "unit-elementary",
      unitName: "Elementary",
      isActive: true,
    });
  });

  it("prevents one Central unit from being assigned to two cards", async () => {
    addMapping({ card_id: "A1" });
    spyOn(GptCodeService, "getAccount").mockResolvedValue({
      cardId: "A2",
      email: "ai2@millennia21.id",
    });
    spyOn(CentralDirectoryService, "accessRuleOptions").mockResolvedValue({
      units: [{ value: "unit:unit-directorate", label: "Directorate", hint: "Central unit" }],
      jobPositions: [],
      jobLevels: [],
    });

    await expect(GptCodeAccessService.setMapping({
      cardId: "A2",
      unitId: "unit-directorate",
      isActive: true,
    })).rejects.toMatchObject({ status: 409 });
  });
});
