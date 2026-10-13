import { describe, expect, it } from "bun:test";
import { isWithdrawn, type CentralCatalogState } from "../service/central-catalog-service";
import type { HubCatalogEntry } from "../type/catalog-type";

const published = (...ids: string[]) => ids.map((id) => ({ id }) as HubCatalogEntry);
const state = (over: Partial<CentralCatalogState> = {}): CentralCatalogState => ({
  read: true,
  entries: published("daily-checkin"),
  known: new Set(["daily-checkin", "exima"]),
  ...over,
});

describe("a Hub row whose application Central no longer shows", () => {
  it("goes when it is linked on purpose and Central does not publish the application", () => {
    // Hidden, retired or removed in Central: not in the published list either way.
    expect(isWithdrawn({ id: "exima", explicitCentralLink: "exima" }, state())).toBe(true);
    expect(isWithdrawn({ id: "emotional-checkin", explicitCentralLink: "daily-checkin" }, state())).toBe(false);
  });

  it("goes when it has no link but its id is one Central knows and does not publish", () => {
    expect(isWithdrawn({ id: "exima" }, state())).toBe(true);
    expect(isWithdrawn({ id: "daily-checkin" }, state())).toBe(false);
  });

  it("stays when Central never heard of it", () => {
    expect(isWithdrawn({ id: "woko" }, state())).toBe(false);
    expect(isWithdrawn({ id: "woko" }, state({ known: null }))).toBe(false);
  });

  it("stays when Central could not be read at all", () => {
    expect(isWithdrawn({ id: "exima", explicitCentralLink: "exima" }, state({ read: false, entries: [], known: null }))).toBe(false);
  });
});
