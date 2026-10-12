import { describe, expect, it } from "bun:test";
import { rowsCoveredByCentral } from "../lib/catalog-prune";

describe("rowsCoveredByCentral", () => {
  const rows = [
    { id: "exima", sso_central_entitlement_app_id: "exima" },
    { id: "emotional-checkin", sso_central_entitlement_app_id: "daily-checkin" },
    { id: "woko", sso_central_entitlement_app_id: null },
    { id: "guide", sso_central_entitlement_app_id: null },
  ];

  it("covers a row by the Central id it points at, or by its own id", () => {
    const covered = rowsCoveredByCentral(rows, ["daily-checkin", "woko"]).map((row) => row.id);
    expect(covered).toEqual(["emotional-checkin", "woko"]);
  });

  it("covers nothing when Central publishes nothing", () => {
    expect(rowsCoveredByCentral(rows, [])).toEqual([]);
  });
});
