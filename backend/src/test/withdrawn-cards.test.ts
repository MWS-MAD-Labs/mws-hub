import { describe, expect, it } from "bun:test";

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
