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

const adminAccess = await import("../lib/admin-access");
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

const ALL_ACCOUNTS = [
  { cardId: "A3", email: "ai3@millennia21.id" },
  { cardId: "A1", email: "ai1@millennia21.id" },
  { cardId: "A5", email: "ai5@millennia21.id" },
  { cardId: "A2", email: "ai2@millennia21.id" },
  { cardId: "A4", email: "ai4@millennia21.id" },
];

let isAdmin: ReturnType<typeof spyOn>;

beforeEach(() => {
  rows.length = 0;
  // Unit rule by default; the admin tests flip this.
  isAdmin = spyOn(adminAccess, "isHubAdmin").mockResolvedValue(false);
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

  it("lets a non-admin name their own account, in any letter case", async () => {
    addMapping();
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A5", email: "ai5@millennia21.id" });
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue({
      cardId: "A5",
      code: "123456",
      timestamp: "29 Oct 2026, 10:00:00",
      subject: "Your ChatGPT code",
    });

    await GptCodeAccessService.codeFor(employee(), "AI5@millennia21.id");
    expect(fetchCode).toHaveBeenCalledWith("A5");
  });

  it("refuses a non-admin who names another unit's account, before reading any code", async () => {
    addMapping();
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A5", email: "ai5@millennia21.id" });
    const fetchCode = spyOn(GptCodeService, "getCode");

    await expect(
      GptCodeAccessService.codeFor(employee(), "ai2@millennia21.id"),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchCode).not.toHaveBeenCalled();
  });
});

describe("GptCodeAccessService for Hub admins (MAD Labs)", () => {
  it("offers every GPT account, ordered by card, without needing a unit mapping", async () => {
    isAdmin.mockResolvedValue(true);
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const mapped = spyOn(GptCodeService, "getAccount");

    await expect(GptCodeAccessService.assignmentFor(employee("unit-mad-labs"))).resolves.toEqual({
      cardId: "A1",
      email: "ai1@millennia21.id",
      unitId: "unit-mad-labs",
      unitName: "Directorate",
      accounts: [
        "ai1@millennia21.id",
        "ai2@millennia21.id",
        "ai3@millennia21.id",
        "ai4@millennia21.id",
        "ai5@millennia21.id",
      ],
    });
    expect(mapped).not.toHaveBeenCalled();
  });

  it("still offers every account when the admin's own unit has a mapping", async () => {
    isAdmin.mockResolvedValue(true);
    addMapping({ unit_id: "unit-mad-labs", card_id: "A2" });
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);

    const assignment = await GptCodeAccessService.assignmentFor(employee("unit-mad-labs"));
    expect(assignment.accounts).toHaveLength(5);
  });

  it("reads the code of the account the admin picked", async () => {
    isAdmin.mockResolvedValue(true);
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue({
      cardId: "A3",
      code: "654321",
      timestamp: "29 Oct 2026, 10:05:00",
      subject: "Your ChatGPT code",
    });

    const { assignment, result } = await GptCodeAccessService.codeFor(employee(), "ai3@millennia21.id");
    expect(fetchCode).toHaveBeenCalledWith("A3");
    expect(assignment).toMatchObject({ cardId: "A3", email: "ai3@millennia21.id" });
    expect(result.code).toBe("654321");
  });

  it("uses the first account when the admin picks none", async () => {
    isAdmin.mockResolvedValue(true);
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue({
      cardId: "A1",
      code: "111111",
      timestamp: "29 Oct 2026, 10:05:00",
      subject: "Your ChatGPT code",
    });

    await GptCodeAccessService.codeFor(employee());
    expect(fetchCode).toHaveBeenCalledWith("A1");
  });

  it("refuses an account that is not in the list", async () => {
    isAdmin.mockResolvedValue(true);
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const fetchCode = spyOn(GptCodeService, "getCode");

    await expect(
      GptCodeAccessService.codeFor(employee(), "someone@millennia21.id"),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchCode).not.toHaveBeenCalled();
  });

  it("still refuses students, admin or not", async () => {
    isAdmin.mockResolvedValue(true);
    await expect(GptCodeAccessService.assignmentFor(student())).rejects.toMatchObject({ status: 403 });
  });
});
