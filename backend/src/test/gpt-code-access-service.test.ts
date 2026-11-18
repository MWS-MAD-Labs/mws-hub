import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
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

type ExceptionRow = {
  id: string;
  person_id: string | null;
  email: string;
  action: "ASSIGN" | "BLOCK";
  card_id: string | null;
  note: string | null;
  created_at: Date;
  updated_at: Date;
};

const exceptions: ExceptionRow[] = [];

const findException = (where: { id?: string; email?: string; person_id?: string }) =>
  exceptions.find((row) =>
    where.id ? row.id === where.id : where.person_id ? row.person_id === where.person_id : row.email === where.email,
  ) ?? null;

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
    gptCodeAccessException: {
      findUnique: async ({ where }: { where: { id?: string; email?: string } }) => findException(where),
      findMany: async () => [...exceptions].sort((a, b) => a.email.localeCompare(b.email)),
      create: async ({ data }: { data: Pick<ExceptionRow, "email" | "person_id" | "action" | "card_id" | "note"> }) => {
        const now = new Date("2026-11-16T00:00:00Z");
        if (exceptions.some((row) => row.email === data.email || (data.person_id && row.person_id === data.person_id))) {
          throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
        }
        const row = { id: `exc-${exceptions.length + 1}`, ...data, created_at: now, updated_at: now };
        exceptions.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<ExceptionRow> }) => {
        const row = exceptions.find((candidate) => candidate.id === where.id);
        if (!row) throw Object.assign(new Error("Not found"), { code: "P2025" });
        if (
          (data.email && exceptions.some((other) => other.id !== row.id && other.email === data.email)) ||
          (data.person_id && exceptions.some((other) => other.id !== row.id && other.person_id === data.person_id))
        ) {
          throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
        }
        Object.assign(row, data, { updated_at: new Date("2026-11-17T00:00:00Z") });
        return row;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const index = exceptions.findIndex((row) => row.id === where.id);
        return exceptions.splice(index, 1)[0];
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
  exceptions.length = 0;
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

  it("gives one account when several match: the most specific kind wins", async () => {
    // RISE unit -> A1, Junior High building -> A2, Head Unit job level -> A3.
    addRule({ card_id: "A1", target_id: "unit-rise", target_name: "RISE" });
    addRule({ card_id: "A2", target_type: "BUILDING", target_id: "bld-jh", target_name: "Junior High" });
    addRule({ card_id: "A3", target_type: "JOB_LEVEL", target_id: "lvl-head", target_name: "Head Unit" });
    const account = spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({
      cardId,
      email: `ai${cardId.slice(1)}@millennia21.id`,
    }));
    const list = spyOn(GptCodeService, "listAccounts");

    const headOfRise = employee({ unitId: "unit-rise", buildingId: "bld-jh", jobLevelId: "lvl-head" });
    const assignment = await GptCodeAccessService.assignmentFor(headOfRise);
    expect(assignment).toMatchObject({ cardId: "A3" });
    expect(assignment.accounts).toBeUndefined();

    // Without the job level the unit beats the building.
    await expect(
      GptCodeAccessService.assignmentFor(employee({ unitId: "unit-rise", buildingId: "bld-jh" })),
    ).resolves.toMatchObject({ cardId: "A1" });
    // Building only.
    await expect(
      GptCodeAccessService.assignmentFor(employee({ unitId: "unit-x", buildingId: "bld-jh" })),
    ).resolves.toMatchObject({ cardId: "A2" });
    expect(list).not.toHaveBeenCalled();
    expect(account).toHaveBeenCalledTimes(3);
  });

  it("breaks a tie within one kind by the lowest card id", async () => {
    addRule({ card_id: "A4" });
    addRule({ card_id: "A2" });
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "x@millennia21.id" }));

    await expect(GptCodeAccessService.assignmentFor(employee())).resolves.toMatchObject({ cardId: "A2" });
  });

  it("refuses a person who names an account that matched but did not win", async () => {
    addRule({ card_id: "A2" });
    addRule({ card_id: "A4", target_type: "BUILDING", target_id: "bld-main", target_name: "Main Building" });
    spyOn(GptCodeService, "getAccount").mockResolvedValue({ cardId: "A2", email: "ai2@millennia21.id" });
    const fetchCode = spyOn(GptCodeService, "getCode");

    await expect(
      GptCodeAccessService.codeFor(employee({ buildingId: "bld-main" }), "ai4@millennia21.id"),
    ).rejects.toMatchObject({ status: 403 });
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
    spyOn(CentralDirectoryService, "directory").mockResolvedValue({
      options: { ...DIRECTORY },
      people: [{ person_id: "person-guru", email: "nama.guru@millennia21.id", name: "Nama Guru", unit: "Elementary" }],
    });
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
    // Active staff, for picking an exception by name.
    expect(configuration.people).toEqual([{ person_id: "person-guru", email: "nama.guru@millennia21.id", name: "Nama Guru", unit: "Elementary" }]);
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

describe("GptCodeAccessService exceptions", () => {
  // Central does not name the person unless a test says so.
  beforeEach(() => {
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(null);
  });

  it("gives an assigned person their card even when no rule matches them", async () => {
    // Mocked first: setException checks the card with Apps Script, which CI cannot reach.
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "ai4@millennia21.id" }));
    await GptCodeAccessService.setException({ email: " Directorate@Millennia21.id ", action: "assign", cardId: "A4" });

    expect(exceptions[0]).toMatchObject({ email: "directorate@millennia21.id", action: "ASSIGN", card_id: "A4" });
    await expect(GptCodeAccessService.assignmentFor(employee("unit-nowhere"))).resolves.toMatchObject({ cardId: "A4" });
  });

  it("beats a matching rule", async () => {
    addRule({ card_id: "A1" });
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "x@millennia21.id" }));
    await GptCodeAccessService.setException({ email: "directorate@millennia21.id", action: "assign", cardId: "A5" });

    await expect(GptCodeAccessService.assignmentFor(employee())).resolves.toMatchObject({ cardId: "A5" });
  });

  it("blocks a person who would match a rule, before reading any code", async () => {
    addRule();
    await GptCodeAccessService.setException({ email: "directorate@millennia21.id", action: "block", cardId: "A1" });
    const fetchCode = spyOn(GptCodeService, "getCode");

    expect(exceptions[0].card_id).toBeNull();
    await expect(GptCodeAccessService.codeFor(employee())).rejects.toMatchObject({ status: 403 });
    expect(fetchCode).not.toHaveBeenCalled();
  });

  it("does not apply to a Hub admin, who keeps every account", async () => {
    isAdmin.mockResolvedValue(true);
    exceptions.push({
      id: "exc-1", person_id: null, email: "directorate@millennia21.id", action: "BLOCK", card_id: null, note: null,
      created_at: new Date(), updated_at: new Date(),
    });
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);

    const assignment = await GptCodeAccessService.assignmentFor(employee());
    expect(assignment.accounts).toHaveLength(5);
  });

  it("replaces the exception of an email that already has one, and removes it by id", async () => {
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "x@millennia21.id" }));
    await GptCodeAccessService.setException({ email: "a@millennia21.id", action: "assign", cardId: "A1" });
    const updated = await GptCodeAccessService.setException({ email: "A@millennia21.id", action: "assign", cardId: "A2", note: "Guest" });

    expect(exceptions).toHaveLength(1);
    expect(updated).toMatchObject({ email: "a@millennia21.id", action: "assign", cardId: "A2", note: "Guest" });

    await GptCodeAccessService.deleteException(updated.id);
    expect(exceptions).toHaveLength(0);
    await expect(GptCodeAccessService.deleteException(updated.id)).rejects.toMatchObject({ status: 404 });
  });

  it("refuses a bad email, action or missing card", async () => {
    await expect(GptCodeAccessService.setException({ email: "nope", action: "block" })).rejects.toMatchObject({ status: 400 });
    await expect(GptCodeAccessService.setException({ email: "a@millennia21.id", action: "allow" })).rejects.toMatchObject({ status: 400 });
    await expect(GptCodeAccessService.setException({ email: "a@millennia21.id", action: "assign" })).rejects.toMatchObject({ status: 400 });
    expect(exceptions).toHaveLength(0);
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

describe("GptCodeAccessService exceptions follow the person, not the email", () => {
  const row = (over: Partial<ExceptionRow> = {}): ExceptionRow => ({
    id: "exc-1", person_id: null, email: "directorate@millennia21.id", action: "BLOCK", card_id: null, note: null,
    created_at: new Date(), updated_at: new Date(), ...over,
  });
  const movedEmployee = () => ({ ...employee(), email: "directorate.new@millennia21.id" });

  beforeEach(() => {
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue(null);
  });

  it("still blocks a person whose email changed in Central, and takes the new email", async () => {
    addRule();
    exceptions.push(row({ person_id: "person-1", email: "directorate@millennia21.id" }));
    const fetchCode = spyOn(GptCodeService, "getCode");

    await expect(GptCodeAccessService.codeFor(movedEmployee())).rejects.toMatchObject({ status: 403 });

    expect(fetchCode).not.toHaveBeenCalled();
    expect(exceptions[0].email).toBe("directorate.new@millennia21.id");
  });

  it("finds an older row by its email the first time and ties it to the person", async () => {
    addRule();
    exceptions.push(row({ person_id: null }));

    await expect(GptCodeAccessService.codeFor(employee())).rejects.toMatchObject({ status: 403 });

    expect(exceptions[0].person_id).toBe("person-1");
  });

  it("does not apply a row tied to another person to the one who now has that email", async () => {
    addRule();
    // The block belongs to person 9, whose old email is the one person 1 has now.
    exceptions.push(row({ person_id: "person-9", email: "directorate@millennia21.id" }));
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "ai@millennia21.id" }));

    // The rule's card (A5) applies, as it would without the row, and the row stays with person 9.
    await expect(GptCodeAccessService.assignmentFor(employee())).resolves.toMatchObject({ cardId: "A5" });
    expect(exceptions[0].person_id).toBe("person-9");
  });

  it("stores the person id when Central names the person, and not when it does not", async () => {
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "x@millennia21.id" }));
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue({ person_id: "person-1" } as never);
    const known = await GptCodeAccessService.setException({ email: "directorate@millennia21.id", action: "block" });
    expect(exceptions[0].person_id).toBe("person-1");
    expect(known.personId).toBe("person-1");

    spyOn(centralClient, "resolveCentralIdentity").mockRejectedValue(new Error("Central is down"));
    await GptCodeAccessService.setException({ email: "guest@example.org", action: "block" });
    expect(exceptions.find((item) => item.email === "guest@example.org")?.person_id).toBeNull();
  });

  it("keeps one exception per person when the admin saves the person under a new email", async () => {
    spyOn(GptCodeService, "getAccount").mockImplementation(async (cardId: string) => ({ cardId, email: "x@millennia21.id" }));
    spyOn(centralClient, "resolveCentralIdentity").mockResolvedValue({ person_id: "person-1" } as never);
    await GptCodeAccessService.setException({ email: "old@millennia21.id", action: "assign", cardId: "A1" });
    await GptCodeAccessService.setException({ email: "new@millennia21.id", action: "assign", cardId: "A2" });

    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toMatchObject({ email: "new@millennia21.id", person_id: "person-1", card_id: "A2" });
  });

  it("ties older exceptions to the people Central lists when the admin screen opens", async () => {
    spyOn(GptCodeService, "listAccounts").mockResolvedValue([...ALL_ACCOUNTS]);
    spyOn(CentralDirectoryService, "directory").mockResolvedValue({
      options: { ...DIRECTORY },
      people: [{ person_id: "person-1", email: "directorate@millennia21.id", name: "Directorate User", unit: "Directorate" }],
    });
    exceptions.push(row({ person_id: null }));

    await GptCodeAccessService.adminConfiguration();

    expect(exceptions[0].person_id).toBe("person-1");
  });
});
