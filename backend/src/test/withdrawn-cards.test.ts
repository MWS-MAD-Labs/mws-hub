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

describe("the card of an application from Central", () => {
  it("takes its status and keywords from Central", async () => {
    const { toCentralEntry } = await import("../service/central-catalog-service");
    const app = { id: "daily-checkin", name: "Daily Check-in", description: "", icon: null, category: null, launch_url: "https://d.test/auth/sso", logout_url: null };
    const taxonomy = { categories: [], scopes: [] };
    const entry = toCentralEntry({ ...app, status: "maintenance", keywords: ["checkin", "mood"] }, taxonomy);
    expect(entry.status).toBe("maintenance");
    expect(entry.keywords).toEqual(["checkin", "mood"]);
    // An older Central sends neither, or something the Hub does not know.
    const plain = toCentralEntry(app, taxonomy);
    expect(plain.status).toBe("active");
    expect(plain.keywords).toEqual([]);
    expect(toCentralEntry({ ...app, status: "gone" as never }, taxonomy).status).toBe("active");
  });
});
