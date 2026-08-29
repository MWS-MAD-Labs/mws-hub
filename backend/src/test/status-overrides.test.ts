import { describe, it, expect } from "bun:test";
import { parseStatusOverrides, applyStatusOverrides } from "../lib/status-overrides";
import { HUB_CATALOG } from "../../seed/default-catalog";
import type { HubCatalogEntry } from "../type/catalog-type";

const knownAppId = HUB_CATALOG[0]!.id;

describe("parseStatusOverrides", () => {
  it("returns an empty map for undefined or blank input", () => {
    expect(parseStatusOverrides(undefined, HUB_CATALOG).size).toBe(0);
    expect(parseStatusOverrides("   ", HUB_CATALOG).size).toBe(0);
  });

  it("parses a single valid <appId>:<status> pair", () => {
    const overrides = parseStatusOverrides(`${knownAppId}:maintenance`, HUB_CATALOG);
    expect(overrides.get(knownAppId)).toBe("maintenance");
  });

  it("parses multiple comma-separated pairs and trims whitespace around them", () => {
    const secondAppId = HUB_CATALOG[1]!.id;
    const overrides = parseStatusOverrides(
      ` ${knownAppId}:maintenance , ${secondAppId}:new `,
      HUB_CATALOG,
    );
    expect(overrides.get(knownAppId)).toBe("maintenance");
    expect(overrides.get(secondAppId)).toBe("new");
  });

  it("ignores a pair missing the ':' separator instead of throwing", () => {
    const overrides = parseStatusOverrides(`${knownAppId}-maintenance`, HUB_CATALOG);
    expect(overrides.size).toBe(0);
  });

  it("ignores a pair naming an app that isn't in the catalog", () => {
    const overrides = parseStatusOverrides("not-a-real-app:maintenance", HUB_CATALOG);
    expect(overrides.size).toBe(0);
  });

  it("ignores a pair with a status outside the known set", () => {
    const overrides = parseStatusOverrides(`${knownAppId}:disabled`, HUB_CATALOG);
    expect(overrides.size).toBe(0);
  });

  it("keeps every valid pair even when one entry in the list is malformed", () => {
    const overrides = parseStatusOverrides(
      `${knownAppId}:maintenance,garbage`,
      HUB_CATALOG,
    );
    expect(overrides.get(knownAppId)).toBe("maintenance");
    expect(overrides.size).toBe(1);
  });
});

describe("applyStatusOverrides", () => {
  const appAId = HUB_CATALOG[0]!.id;
  const appBId = HUB_CATALOG[1]!.id;

  const catalog: HubCatalogEntry[] = [
    {
      id: appAId,
      name: "App A",
      icon: "Box",
      description: "",
      category: "utilities",
      audience: "Staff",
      keywords: [],
      href: "https://example.com/a",
      external: true,
      status: "active",
      discoverable: true,
      allowedSources: ["staff"],
    },
    {
      id: appBId,
      name: "App B",
      icon: "Box",
      description: "",
      category: "utilities",
      audience: "Staff",
      keywords: [],
      href: "https://example.com/b",
      external: true,
      status: "active",
      discoverable: true,
      allowedSources: ["staff"],
    },
  ];

  it("returns the catalog unmodified when there are no active overrides", () => {
    const original = process.env.HUB_APP_STATUS_OVERRIDES;
    delete process.env.HUB_APP_STATUS_OVERRIDES;

    const result = applyStatusOverrides(catalog);
    expect(result).toBe(catalog);

    if (original !== undefined) process.env.HUB_APP_STATUS_OVERRIDES = original;
  });

  it("overrides only the named app's status, leaving every other entry untouched", () => {
    const original = process.env.HUB_APP_STATUS_OVERRIDES;
    process.env.HUB_APP_STATUS_OVERRIDES = `${appAId}:maintenance`;

    const result = applyStatusOverrides(catalog);
    expect(result.find((entry) => entry.id === appAId)?.status).toBe("maintenance");
    expect(result.find((entry) => entry.id === appBId)?.status).toBe("active");

    if (original === undefined) delete process.env.HUB_APP_STATUS_OVERRIDES;
    else process.env.HUB_APP_STATUS_OVERRIDES = original;
  });
});
