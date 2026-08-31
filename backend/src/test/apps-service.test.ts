import { afterEach, describe, expect, it, mock } from "bun:test";
import { HUB_CATALOG } from "../../seed/default-catalog";
import type { HubCatalogEntry } from "../type/catalog-type";
import type { HubUser } from "../type/central-type";

type ApprovedAccessRequest = {
  application_id: string;
  requester_email: string;
};

let approvedAccessRequests: ApprovedAccessRequest[] = [];

mock.module("../service/application-service", () => ({
  ApplicationService: {
    listActive: async () => HUB_CATALOG,
  },
}));

mock.module("../lib/prisma", () => ({
  prisma: {
    accessRequest: {
      findMany: async (args: {
        where: { requester_email: string; status: string };
      }) =>
        approvedAccessRequests
          .filter(
            (request) =>
              request.requester_email === args.where.requester_email &&
              args.where.status === "APPROVED",
          )
          .map((request) => ({ application_id: request.application_id })),
      count: async (args: {
        where: {
          application_id: string;
          requester_email: string;
          status: string;
        };
      }) =>
        approvedAccessRequests.filter(
          (request) =>
            request.application_id === args.where.application_id &&
            request.requester_email === args.where.requester_email &&
            args.where.status === "APPROVED",
        ).length,
    },
  },
}));

const { AppsService, canAccess, isVisibleTo } = await import("../service/apps-service");

afterEach(() => {
  approvedAccessRequests = [];
});

function employee(overrides: Partial<HubUser & { source: "employee" }> = {}): HubUser {
  return {
    source: "employee",
    id: "emp-1",
    employee_id: "E001",
    full_name: "Test Employee",
    nick_name: null,
    email: "employee@millennia21.id",
    photo_url: null,
    unit: null,
    job_position: null,
    job_level: null,
    status: "ACTIVE",
    employment_type: null,
    role: null,
    roles: null,
    permissions: null,
    ...overrides,
  } as HubUser;
}

function student(overrides: Partial<HubUser & { source: "student" }> = {}): HubUser {
  return {
    source: "student",
    id: "stu-1",
    nis: null,
    nisn: null,
    full_name: "Test Student",
    nick_name: null,
    email: "student@millennia21.id",
    status: "ACTIVE",
    current_grade: null,
    current_class: null,
    role: null,
    roles: null,
    permissions: null,
    ...overrides,
  } as HubUser;
}

function entry(overrides: Partial<HubCatalogEntry> = {}): HubCatalogEntry {
  return {
    id: "test-app",
    name: "Test App",
    icon: "Box",
    description: "An app used only in tests.",
    category: "utilities",
    audience: "Staff",
    keywords: [],
    href: "https://example.com",
    external: true,
    status: "active",
    discoverable: true,
    allowedSources: ["staff"],
    ...overrides,
  };
}

describe("canAccess - source-based access", () => {
  it("admits everyone to a public app regardless of identity source", () => {
    const app = entry({ allowedSources: ["public"] });
    expect(canAccess(app, employee())).toBe(true);
    expect(canAccess(app, student())).toBe(true);
  });

  it("admits a student when the app explicitly lists the student source", () => {
    const app = entry({ allowedSources: ["student"] });
    expect(canAccess(app, student())).toBe(true);
  });

  it("refuses a student an app scoped to employee-only audiences", () => {
    const app = entry({ allowedSources: ["staff"] });
    expect(canAccess(app, student())).toBe(false);
  });

  it("admits a staff-scoped app from Central job level data", () => {
    const app = entry({ allowedSources: ["staff"] });
    expect(canAccess(app, employee({ job_level: "Staff" }))).toBe(true);
  });

  it("resolves a teacher audience from Central's role field", () => {
    const app = entry({ allowedSources: ["teacher"] });
    expect(canAccess(app, employee({ role: "Teacher" }))).toBe(true);
  });

  it("does not translate a Central role into a different Hub audience key", () => {
    const app = entry({ allowedSources: ["teacher"] });
    expect(canAccess(app, employee({ role: "Guru" }))).toBe(false);
  });

  it("matches Central labels by normalized token, not by a manual alias table", () => {
    const app = entry({ allowedSources: ["principal"] });
    expect(canAccess(app, employee({ role: "Principal" }))).toBe(true);
  });

  it("reads roles from the `roles` array, not just the singular `role` field", () => {
    const app = entry({ allowedSources: ["director"] });
    expect(canAccess(app, employee({ roles: ["Director"] }))).toBe(true);
  });

  it("reads structured claim objects (name/slug/role) inside roles/permissions", () => {
    const app = entry({ allowedSources: ["admin"] });
    expect(canAccess(app, employee({ roles: [{ name: "Super Admin" }] }))).toBe(true);
  });

  it("does not match a bare rule against a token inside Central job metadata", () => {
    const app = entry({ allowedSources: ["teacher"] });
    expect(canAccess(app, employee({ job_position: "Homeroom Teacher" }))).toBe(false);
  });

  it("does not let a bare admin rule match Admin Staff job metadata", () => {
    const app = entry({ allowedSources: ["admin"] });
    const user = employee({ job_position: "Admin Staff", job_level: "Staff" });
    expect(canAccess(app, user)).toBe(false);
  });

  it("still allows exact legacy metadata labels without substring token matching", () => {
    const app = entry({ allowedSources: ["staff"] });
    expect(canAccess(app, employee({ job_level: "Staff" }))).toBe(true);
  });

  it("does not infer translated labels from Central job metadata", () => {
    const app = entry({ allowedSources: ["teacher"] });
    const user = employee({ job_position: "Guru Kelas" });
    expect(canAccess(app, user)).toBe(false);
  });

  it("never grants a student access via role/job fallbacks - identity resolution stops at source", () => {
    const app = entry({ allowedSources: ["teacher"] });
    const user = student({ role: "Teacher" });
    expect(canAccess(app, user)).toBe(false);
  });
});

describe("canAccess - explicit permission override", () => {
  it("admits a user whose permissions name this exact app, even outside allowedSources", () => {
    const app = entry({ id: "proofpoint", allowedSources: ["admin"] });
    const user = employee({ permissions: ["hub:apps:proofpoint:launch"] });
    expect(canAccess(app, user)).toBe(true);
  });

  it("matches the sso appId alias when the entry has one, not just the catalog id", () => {
    const app = entry({
      id: "emotional-checkin",
      allowedSources: ["admin"],
      sso: { appId: "daily-checkin", entryUrl: "https://example.com/auth/sso" },
    });
    const user = employee({ permissions: ["apps:daily-checkin:launch"] });
    expect(canAccess(app, user)).toBe(true);
  });

  it("does not grant access from a permission naming a different app", () => {
    const app = entry({ id: "proofpoint", allowedSources: ["admin"] });
    const user = employee({ permissions: ["hub:apps:exima:launch"] });
    expect(canAccess(app, user)).toBe(false);
  });

  it("admits a user by Central unit id", () => {
    const app = entry({ allowedSources: ["unit:unit-1"] });
    expect(canAccess(app, employee({ unit_id: "unit-1" }))).toBe(true);
    expect(canAccess(app, employee({ unit_id: "unit-2" }))).toBe(false);
  });

  it("admits a user by Central job position id", () => {
    const app = entry({ allowedSources: ["job-position:position-1"] });
    expect(
      canAccess(app, employee({ job_position_id: "position-1" })),
    ).toBe(true);
    expect(
      canAccess(app, employee({ job_position_id: "position-2" })),
    ).toBe(false);
  });

  it("admits a user by Central job position label when Central has not exposed its id", () => {
    const app = entry({ allowedSources: ["job-position-label:Homeroom Teacher"] });
    expect(
      canAccess(app, employee({ job_position: "Homeroom Teacher" })),
    ).toBe(true);
    expect(
      canAccess(app, employee({ job_position: "Subject Teacher" })),
    ).toBe(false);
  });

  it("admits a user by Central job level label when Central has not exposed its id", () => {
    const app = entry({ allowedSources: ["job-level-label:Teacher"] });
    expect(canAccess(app, employee({ job_level: "Teacher" }))).toBe(true);
    expect(canAccess(app, employee({ job_level: "Staff" }))).toBe(false);
  });

  it("lets an explicit permission reach a student, bypassing the student-only source guard", () => {
    const app = entry({ id: "proofpoint", allowedSources: ["staff"] });
    const user = student({ permissions: ["hub:apps:proofpoint:launch"] });
    expect(canAccess(app, user)).toBe(true);
  });
});

describe("isVisibleTo", () => {
  it("hides a discoverable:false app from the grid even when access is granted", () => {
    const app = entry({ allowedSources: ["public"], discoverable: false });
    expect(canAccess(app, employee())).toBe(true);
    expect(isVisibleTo(app, employee())).toBe(false);
  });

  it("keeps a discoverable locked app visible so the user can request access", () => {
    const app = entry({ allowedSources: ["admin"], discoverable: true });
    expect(isVisibleTo(app, employee())).toBe(true);
  });

  it("shows a discoverable app the user can access", () => {
    const app = entry({ allowedSources: ["public"], discoverable: true });
    expect(isVisibleTo(app, employee())).toBe(true);
  });
});

describe("AppsService.findByLaunchId", () => {
  it("finds an entry by its catalog id", async () => {
    expect((await AppsService.findByLaunchId("exima"))?.id).toBe("exima");
  });

  it("finds an entry by its sso appId when it differs from the catalog id", async () => {
    const found = await AppsService.findByLaunchId("daily-checkin");
    expect(found?.id).toBe("emotional-checkin");
  });

  it("returns null for an id nothing in the catalog matches", async () => {
    expect(await AppsService.findByLaunchId("does-not-exist")).toBeNull();
  });
});

describe("AppsService.accessTagsFor", () => {
  it("does not mint substring tags from Central job metadata", () => {
    const tags = AppsService.accessTagsFor(
      employee({ job_position: "Admin Staff", job_level: "Staff" }),
    );

    expect(tags).not.toContain("admin");
    expect(tags).toContain("admin-staff");
    expect(tags).toContain("staff");
  });
});

describe("AppsService.listFor against the real catalog", () => {
  it("marks an admin-only app as locked for a plain employee with no elevated role", async () => {
    const listing = await AppsService.listFor(employee());
    expect(listing.find((app) => app.id === "slides-generator")?.access).toBe(
      "locked",
    );
  });

  it("locks admin-only apps for Admin Staff unless Central sends an explicit admin claim", async () => {
    const listing = await AppsService.listFor(
      employee({ job_position: "Admin Staff", job_level: "Staff" }),
    );

    expect(listing.find((app) => app.id === "slides-generator")?.access).toBe(
      "locked",
    );
    expect(listing.find((app) => app.id === "it-assets")?.access).toBe(
      "locked",
    );
  });

  it("includes an app explicitly scoped to students for a student user", async () => {
    const listing = await AppsService.listFor(student());
    expect(listing.some((app) => app.id === "emotional-checkin")).toBe(true);
  });

  it("marks an employee-only app as locked for a student", async () => {
    const listing = await AppsService.listFor(student());
    expect(listing.find((app) => app.id === "report-assistant")?.access).toBe(
      "locked",
    );
  });

  it("grants a locked app when the user has an approved access request", async () => {
    approvedAccessRequests = [
      {
        application_id: "report-assistant",
        requester_email: "student@millennia21.id",
      },
    ];

    const listing = await AppsService.listFor(student());
    expect(listing.find((app) => app.id === "report-assistant")?.access).toBe(
      "granted",
    );
  });

  it("allows launch when the user has an approved access request", async () => {
    const app = entry({
      id: "mtss",
      allowedSources: ["employee"],
    });
    const user = student({ email: "dummystudent@millennia21.id" });
    approvedAccessRequests = [
      {
        application_id: "mtss",
        requester_email: "dummystudent@millennia21.id",
      },
    ];

    expect(await AppsService.canLaunch(app, user)).toBe(true);
  });

  it("never leaks allowedSources or the raw sso config to the response shape", async () => {
    const listing = await AppsService.listFor(employee({ role: "Teacher" }));
    for (const app of listing) {
      expect((app as unknown as { allowedSources?: unknown }).allowedSources).toBeUndefined();
      expect((app as unknown as { sso?: unknown }).sso).toBeUndefined();
    }
  });
});
