import { describe, expect, it, mock } from "bun:test";
import { HUB_CATALOG } from "../data/hub-catalog";
import type { HubCatalogEntry } from "../type/catalog-type";
import type { HubUser } from "../type/central-type";

mock.module("../service/application-service", () => ({
  ApplicationService: {
    listActive: async () => HUB_CATALOG,
  },
}));

const { AppsService, canAccess, isVisibleTo } = await import("../service/apps-service");

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

  it("admits any active employee to a staff-scoped app, even with no role data", () => {
    const app = entry({ allowedSources: ["staff"] });
    expect(canAccess(app, employee())).toBe(true);
  });

  it("resolves a teacher audience from Central's role field", () => {
    const app = entry({ allowedSources: ["teacher"] });
    expect(canAccess(app, employee({ role: "Teacher" }))).toBe(true);
  });

  it("resolves a teacher audience through an Indonesian alias (guru)", () => {
    const app = entry({ allowedSources: ["teacher"] });
    expect(canAccess(app, employee({ role: "Guru" }))).toBe(true);
  });

  it("resolves a principal audience through an Indonesian alias (kepala sekolah)", () => {
    const app = entry({ allowedSources: ["principal"] });
    expect(canAccess(app, employee({ role: "Kepala Sekolah" }))).toBe(true);
  });

  it("reads roles from the `roles` array, not just the singular `role` field", () => {
    const app = entry({ allowedSources: ["director"] });
    expect(canAccess(app, employee({ roles: ["Director"] }))).toBe(true);
  });

  it("reads structured claim objects (name/slug/role) inside roles/permissions", () => {
    const app = entry({ allowedSources: ["admin"] });
    expect(canAccess(app, employee({ roles: [{ name: "Super Admin" }] }))).toBe(true);
  });

  it("falls back to job metadata only when Central sent no role/permission claims at all", () => {
    const app = entry({ allowedSources: ["teacher"] });
    expect(canAccess(app, employee({ job_position: "Teacher" }))).toBe(true);
  });

  it("does not fall back to job metadata once any explicit claim is present, even an unrelated one", () => {
    const app = entry({ allowedSources: ["teacher"] });
    const user = employee({ role: "Something Unrelated", job_position: "Teacher" });
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

  it("keeps a discoverable app out of the grid when the user has no access", () => {
    const app = entry({ allowedSources: ["admin"], discoverable: true });
    expect(isVisibleTo(app, employee())).toBe(false);
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

describe("AppsService.listFor against the real catalog", () => {
  it("hides an admin-only app from a plain employee with no elevated role", async () => {
    const listing = await AppsService.listFor(employee());
    expect(listing.some((app) => app.id === "slides-generator")).toBe(false);
  });

  it("includes an app explicitly scoped to students for a student user", async () => {
    const listing = await AppsService.listFor(student());
    expect(listing.some((app) => app.id === "emotional-checkin")).toBe(true);
  });

  it("excludes an employee-only app from a student's listing", async () => {
    const listing = await AppsService.listFor(student());
    expect(listing.some((app) => app.id === "report-assistant")).toBe(false);
  });

  it("never leaks allowedSources or the raw sso config to the response shape", async () => {
    const listing = await AppsService.listFor(employee({ role: "Teacher" }));
    for (const app of listing) {
      expect((app as unknown as { allowedSources?: unknown }).allowedSources).toBeUndefined();
      expect((app as unknown as { sso?: unknown }).sso).toBeUndefined();
    }
  });
});
