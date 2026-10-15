import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { listRegisteredPermissions, permissionUsage, publishPermissions } from "../lib/central-client";
import { HUB_ADMIN_PERMISSION, HUB_PERMISSIONS } from "../lib/hub-permissions";
import { comparePermissions, permissionCheckFailed } from "../lib/permission-check";

const originalFetch = global.fetch;

beforeAll(() => {
  process.env.CENTRAL_API_BASE_URL ??= "http://central.test/api/internal";
  process.env.CENTRAL_API_TOKEN ??= "test-token";
});

afterEach(() => {
  global.fetch = originalFetch;
});

const row = (key: string, requires: string[] = [], deprecated = false) => ({
  key,
  description: null,
  requires,
  source: "MANIFEST" as const,
  deprecated,
});

describe("Hub permission list", () => {
  it("has the admin permission the gate checks, and it needs the use permission", () => {
    const admin = HUB_PERMISSIONS.find((entry) => entry.key === HUB_ADMIN_PERMISSION);
    expect(admin?.requires).toEqual(["hub.use"]);
    expect(HUB_PERMISSIONS.map((entry) => entry.key)).toContain("hub.use");
  });

  it("has no need that points outside the list", () => {
    const keys = HUB_PERMISSIONS.map((entry) => entry.key);
    for (const entry of HUB_PERMISSIONS) for (const needed of entry.requires ?? []) expect(keys).toContain(needed);
  });
});

describe("Central permission calls", () => {
  it("publishes with the token and surfaces Central's refusal", async () => {
    let seen: { url: string; method?: string; body: unknown; authorization: string } | null = null;
    global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      seen = {
        url: String(input),
        method: init?.method,
        body: JSON.parse(String(init?.body)),
        authorization: new Headers(init?.headers).get("authorization") ?? "",
      };
      return new Response(JSON.stringify({ data: { application_id: "hub", total: 2, added: 2, deprecated: [], affected_roles: [] } }), { status: 200 });
    }) as unknown as typeof fetch;
    const result = await publishPermissions("hub", HUB_PERMISSIONS, true);
    expect(result.added).toBe(2);
    expect(seen).toMatchObject({
      url: `${process.env.CENTRAL_API_BASE_URL}/application-permissions/hub`,
      method: "PUT",
      body: { permissions: HUB_PERMISSIONS, confirm_removals: true },
      authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}`,
    });

    global.fetch = (async () => new Response(JSON.stringify({ errors: "This list drops 3 of 4" }), { status: 409 })) as unknown as typeof fetch;
    await expect(publishPermissions("hub", HUB_PERMISSIONS)).rejects.toThrow("This list drops 3 of 4");
  });

  it("reads what is registered and what roles carry", async () => {
    global.fetch = (async (input: string | URL | Request) =>
      new Response(JSON.stringify({ data: String(input).endsWith("/usage") ? ["hub.use"] : [row("hub.use")] }), { status: 200 })) as unknown as typeof fetch;
    expect(await listRegisteredPermissions("hub")).toEqual([row("hub.use")]);
    expect(await permissionUsage("hub")).toEqual(["hub.use"]);
  });
});

describe("permission check", () => {
  it("passes when Hub's code and Central agree", () => {
    const check = comparePermissions(HUB_PERMISSIONS, [row("hub.use"), row("hub.admin", ["hub.use"])], ["hub.use", "hub.admin"]);
    expect(permissionCheckFailed(check)).toBe(false);
  });

  it("fails on a permission roles carry that the code lost, and on differing needs", () => {
    const check = comparePermissions(HUB_PERMISSIONS, [row("hub.use"), row("hub.admin"), row("hub.old")], ["hub.old"]);
    expect(check.unknownToCode).toEqual(["hub.old"]);
    expect(check.requiresDiffer).toEqual(["hub.admin"]);
    expect(permissionCheckFailed(check, true)).toBe(true);
  });

  it("treats a permission only waiting for the deploy as fine", () => {
    const check = comparePermissions(HUB_PERMISSIONS, [row("hub.use")], []);
    expect(check.notRegistered).toEqual(["hub.admin"]);
    expect(permissionCheckFailed(check)).toBe(false);
  });
});
