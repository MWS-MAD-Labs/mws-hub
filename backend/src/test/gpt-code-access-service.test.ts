import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { HubUser } from "../type/central-type";

type TargetType = "UNIT" | "JOB_LEVEL" | "JOB_POSITION" | "BUILDING";

type RuleRow = {
  id: string;
  card_id: string;
  target_type: TargetType;
  target_id: string;
  target_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type RuleWhere = {
  card_id?: string;
  is_active?: boolean;
  OR?: { target_type: TargetType; target_id: string }[];
};

const rows: RuleRow[] = [];

const matches = (row: RuleRow, where: RuleWhere = {}) =>
  (where.card_id === undefined || row.card_id === where.card_id) &&
  (where.is_active === undefined || row.is_active === where.is_active) &&
  (where.OR === undefined ||
    where.OR.some((target) => target.target_type === row.target_type && target.target_id === row.target_id));

mock.module("../lib/prisma", () => ({
  prisma: {
    gptCodeAccessRule: {
      findMany: async ({ where }: { where?: RuleWhere } = {}) =>
        rows.filter((row) => matches(row, where)).sort((a, b) => a.card_id.localeCompare(b.card_id)),
      deleteMany: async ({ where }: { where: RuleWhere }) => {
        const keep = rows.filter((row) => !matches(row, where));
        const count = rows.length - keep.length;
        rows.splice(0, rows.length, ...keep);
        return { count };
      },
      createMany: async ({ data }: { data: Omit<RuleRow, "id" | "created_at" | "updated_at">[] }) => {
        for (const item of data) {
          rows.push({
            id: `rule-${rows.length + 1}`,
            ...item,
            created_at: new Date("2026-11-02T00:00:00Z"),
            updated_at: new Date("2026-11-02T00:00:00Z"),
          });
        }
        return { count: data.length };
      },
    },
    // The service hands over already-started operations; settling them in
    // order is enough for an in-memory table.
    $transaction: async (operations: Promise<unknown>[]) => {
      const results = [];
      for (const operation of operations) results.push(await operation);
      return results;
    },
  },
}));

const adminAccess = await import("../lib/admin-access");
const { CentralDirectoryService } = await import("../service/central-directory-service");
const { GptCodeService } = await import("../service/gpt-code-service");
const { GptCodeAccessService } = await import("../service/gpt-code-access-service");

type Ids = { unitId?: string; jobLevelId?: string; jobPositionId?: string; buildingId?: string };

function employee(ids: Ids | string = {}): HubUser {
  const { unitId = "unit-directorate", jobLevelId, jobPositionId, buildingId } =
    typeof ids === "string" ? { unitId: ids } : ids;
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
    job_position_id: jobPositionId ?? null,
    job_level: null,
    job_level_id: jobLevelId ?? null,
    building_id: buildingId ?? null,
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

function addRule(overrides: Partial<RuleRow> = {}) {
  rows.push({
    id: `rule-${rows.length + 1}`,
    card_id: "A5",
    target_type: "UNIT",
    target_id: "unit-directorate",
    target_name: "Directorate",
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

const DIRECTORY = {
  units: [
    { value: "unit:unit-directorate", label: "Directorate", hint: "Central unit" },
    { value: "unit:unit-elementary", label: "Elementary", hint: "Central unit" },
  ],
  jobPositions: [
    { value: "job-position:pos-dev", label: "Developer", hint: "" },
    { value: "job-position-label:Named Only", label: "Named Only", hint: "" },
  ],
  jobLevels: [{ value: "job-level:lvl-staff", label: "Staff", hint: "" }],
  buildings: [{ value: "building:bld-main", label: "Main Building", hint: "" }],
};

const code = (cardId: string) => ({
  cardId,
  code: "123456",
  timestamp: "29 Oct 2026, 10:00:00",
  subject: "Your ChatGPT code",
});

let isAdmin: ReturnType<typeof spyOn>;

beforeEach(() => {
  rows.length = 0;
  // Rule matching by default; the admin tests flip this.
  isAdmin = spyOn(adminAccess, "isHubAdmin").mockResolvedValue(false);
});

afterEach(() => {
  mock.restore();
});

describe("GptCodeAccessService for staff", () => {
  it("resolves only the GPT account mapped to the employee's current unit", async () => {
    addRule();
    addRule({ card_id: "A2", target_id: "unit-elementary", target_name: "Elementary" });
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

  it("matches on job level, job position and building, the same way as the unit", async () => {
    const account = spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A3", email: "ai3@millennia21.id" });

    for (const [target_type, target_id, ids] of [
      ["JOB_LEVEL", "lvl-staff", { unitId: "unit-x", jobLevelId: "lvl-staff" }],
      ["JOB_POSITION", "pos-dev", { unitId: "unit-x", jobPositionId: "pos-dev" }],
      ["BUILDING", "bld-main", { unitId: "unit-x", buildingId: "bld-main" }],
    ] as const) {
      rows.length = 0;
      addRule({ card_id: "A3", target_type, target_id, target_name: target_id });
      await expect(GptCodeAccessService.assignmentFor(employee(ids))).resolves.toMatchObject({ cardId: "A3" });
    }
    expect(account).toHaveBeenCalledTimes(3);
  });

  it("offers a picker limited to the accounts that match when several do", async () => {
    addRule({ card_id: "A2" });
    addRule({ card_id: "A4", target_type: "BUILDING", target_id: "bld-main", target_name: "Main Building" });
    addRule({ card_id: "A1", target_id: "unit-elementary", target_name: "Elementary" });
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);

    await expect(
      GptCodeAccessService.assignmentFor(employee({ buildingId: "bld-main" })),
    ).resolves.toEqual({
      cardId: "A2",
      email: "ai2@millennia21.id",
      unitId: "unit-directorate",
      unitName: "Directorate",
      accounts: ["ai2@millennia21.id", "ai4@millennia21.id"],
    });
  });

  it("lets a person with several matches read any of them, and nothing else", async () => {
    addRule({ card_id: "A2" });
    addRule({ card_id: "A4", target_type: "BUILDING", target_id: "bld-main", target_name: "Main Building" });
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue(code("A4"));
    const user = employee({ buildingId: "bld-main" });

    const { assignment, viaAdmin } = await GptCodeAccessService.codeFor(user, "ai4@millennia21.id");
    expect(fetchCode).toHaveBeenCalledWith("A4");
    expect(assignment.cardId).toBe("A4");
    expect(viaAdmin).toBe(false);

    fetchCode.mockClear();
    await expect(GptCodeAccessService.codeFor(user, "ai1@millennia21.id")).rejects.toMatchObject({ status: 403 });
    expect(fetchCode).not.toHaveBeenCalled();
  });

  it("refuses staff without an active matching rule", async () => {
    addRule({ is_active: false });
    await expect(GptCodeAccessService.assignmentFor(employee())).rejects.toMatchObject({
      status: 403,
    });
    await expect(GptCodeAccessService.assignmentFor(employee("unit-elementary"))).rejects.toMatchObject({
      status: 403,
    });
  });

  it("refuses students even when their unit has a rule", async () => {
    addRule();
    await expect(GptCodeAccessService.assignmentFor(student())).rejects.toMatchObject({
      status: 403,
    });
  });

  it("fetches a code only after resolving the caller's rules", async () => {
    addRule();
    spyOn(GptCodeService, "getAccount").mockResolvedValue({
      cardId: "A5",
      email: "ai5@millennia21.id",
    });
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue(code("A5"));

    const response = await GptCodeAccessService.codeFor(employee());
    expect(response.result.code).toBe("123456");
    expect(fetchCode).toHaveBeenCalledWith("A5");
  });

  it("lets a single-match person name their own account, in any letter case", async () => {
    addRule();
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A5", email: "ai5@millennia21.id" });
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue(code("A5"));

    await GptCodeAccessService.codeFor(employee(), "AI5@millennia21.id");
    expect(fetchCode).toHaveBeenCalledWith("A5");
  });

  it("refuses a single-match person who names another account, before reading any code", async () => {
    addRule();
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A5", email: "ai5@millennia21.id" });
    const fetchCode = spyOn(GptCodeService, "getCode");

    await expect(
      GptCodeAccessService.codeFor(employee(), "ai2@millennia21.id"),
    ).rejects.toMatchObject({ status: 403 });
    expect(fetchCode).not.toHaveBeenCalled();
  });
});

describe("GptCodeAccessService mappings (admin screen)", () => {
  beforeEach(() => {
    spyOn(CentralDirectoryService, "accessRuleOptions").mockResolvedValue({ ...DIRECTORY });
  });

  it("saves several targets of every kind for one card, with Central's names", async () => {
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A1", email: "ai1@millennia21.id" });

    const mapping = await GptCodeAccessService.setMapping({
      cardId: "A1",
      isActive: true,
      targets: [
        { type: "unit", id: "unit-elementary" },
        { type: "job_level", id: "lvl-staff" },
        { type: "job_position", id: "pos-dev" },
        { type: "building", id: "bld-main" },
        { type: "unit", id: "unit-elementary" }, // duplicate, stored once
      ],
    });

    expect(mapping.cardId).toBe("A1");
    expect(mapping.isActive).toBe(true);
    expect(mapping.targets).toHaveLength(4);
    expect(mapping.targets).toContainEqual({ type: "building", id: "bld-main", name: "Main Building" });
    expect(mapping.targets).toContainEqual({ type: "unit", id: "unit-elementary", name: "Elementary" });
  });

  it("lets the same unit sit on two cards", async () => {
    addRule({ card_id: "A1" });
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A2", email: "ai2@millennia21.id" });

    await GptCodeAccessService.setMapping({
      cardId: "A2",
      isActive: true,
      targets: [{ type: "unit", id: "unit-directorate" }],
    });
    expect(rows.filter((row) => row.target_id === "unit-directorate").map((row) => row.card_id).sort()).toEqual(["A1", "A2"]);
  });

  it("replaces a card's whole rule set on save", async () => {
    addRule({ card_id: "A1" });
    addRule({ card_id: "A1", target_type: "BUILDING", target_id: "bld-main", target_name: "Main Building" });
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A1", email: "ai1@millennia21.id" });

    const mapping = await GptCodeAccessService.setMapping({
      cardId: "A1",
      isActive: false,
      targets: [{ type: "job_level", id: "lvl-staff" }],
    });
    expect(mapping.targets).toEqual([{ type: "job_level", id: "lvl-staff", name: "Staff" }]);
    expect(mapping.isActive).toBe(false);
    expect(rows.filter((row) => row.card_id === "A1")).toHaveLength(1);
  });

  it("refuses a target Central does not have, or one known only by name", async () => {
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A1", email: "ai1@millennia21.id" });

    await expect(GptCodeAccessService.setMapping({
      cardId: "A1",
      isActive: true,
      targets: [{ type: "building", id: "bld-unknown" }],
    })).rejects.toMatchObject({ status: 400 });
    await expect(GptCodeAccessService.setMapping({
      cardId: "A1",
      isActive: true,
      targets: [{ type: "job_position", id: "Named Only" }],
    })).rejects.toMatchObject({ status: 400 });
    expect(rows).toHaveLength(0);
  });

  it("refuses an empty or malformed target list", async () => {
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A1", email: "ai1@millennia21.id" });

    await expect(GptCodeAccessService.setMapping({ cardId: "A1", isActive: true, targets: [] }))
      .rejects.toMatchObject({ status: 400 });
    await expect(GptCodeAccessService.setMapping({
      cardId: "A1",
      isActive: true,
      targets: [{ type: "team", id: "x" }],
    })).rejects.toMatchObject({ status: 400 });
  });

  it("offers Central's choices by id for every kind", async () => {
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const configuration = await GptCodeAccessService.adminConfiguration();

    expect(configuration.centralAvailable).toBe(true);
    expect(configuration.targets.building).toEqual([{ id: "bld-main", label: "Main Building" }]);
    // A name-only position has no Central id to match on, so it is not offered.
    expect(configuration.targets.job_position).toEqual([{ id: "pos-dev", label: "Developer" }]);
  });

  it("removes every rule of a card", async () => {
    addRule({ card_id: "A1" });
    addRule({ card_id: "A1", target_type: "BUILDING", target_id: "bld-main", target_name: "Main Building" });
    addRule({ card_id: "A2" });
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A1", email: "ai1@millennia21.id" });

    const removed = await GptCodeAccessService.deleteMapping("A1");
    expect(removed.targets).toHaveLength(2);
    expect(rows.map((row) => row.card_id)).toEqual(["A2"]);
  });
});

describe("GptCodeAccessService for Hub admins (MAD Labs)", () => {
  it("offers every GPT account, ordered by card, without needing a rule", async () => {
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

  it("still offers every account when the admin's own unit has a rule", async () => {
    isAdmin.mockResolvedValue(true);
    addRule({ target_id: "unit-mad-labs", card_id: "A2" });
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);

    const assignment = await GptCodeAccessService.assignmentFor(employee("unit-mad-labs"));
    expect(assignment.accounts).toHaveLength(5);
  });

  it("reads the code of the account the admin picked, marked as an admin read", async () => {
    isAdmin.mockResolvedValue(true);
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue({ ...code("A3"), code: "654321" });

    const { assignment, result, viaAdmin } = await GptCodeAccessService.codeFor(employee(), "ai3@millennia21.id");
    expect(fetchCode).toHaveBeenCalledWith("A3");
    expect(assignment).toMatchObject({ cardId: "A3", email: "ai3@millennia21.id" });
    expect(result.code).toBe("654321");
    expect(viaAdmin).toBe(true);
  });

  it("uses the first account when the admin picks none", async () => {
    isAdmin.mockResolvedValue(true);
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    const fetchCode = spyOn(GptCodeService, "getCode").mockResolvedValue(code("A1"));

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
