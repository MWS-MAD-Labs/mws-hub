import { afterEach, describe, expect, it } from "bun:test";
import { CentralFailure, failureForNetwork, failureForResponse, kindForStatus } from "../lib/central-failure";
import { withRetries } from "../lib/retry";
import { startPermissionSync, stopPermissionSyncForTest, syncPermissionsOnce } from "../lib/permission-sync";

const manifest = [{ key: "a", description: "A" }, { key: "b", description: "B", requires: ["a"] }];
const row = (key: string, requires: string[] = []) => ({ key, description: null, requires, source: "MANIFEST" as const, deprecated: false });
const sent = { application_id: "hub", total: 2, added: 1, deprecated: [], affected_roles: [] };

afterEach(() => {
  delete process.env.HUB_PERMISSION_SYNC;
  stopPermissionSyncForTest();
});

describe("Central failures", () => {
  it("fall into asking again, not deployed yet, or no", () => {
    expect(kindForStatus(503)).toBe("unreachable");
    expect(kindForStatus(404)).toBe("missing");
    expect(kindForStatus(409)).toBe("rejected");
    expect(failureForResponse(404).message).toContain("deploy Central first");
    expect(failureForResponse(409, "This list drops 3 of 4").message).toContain("This list drops 3 of 4");
    expect(failureForNetwork(new Error("fetch failed")).kind).toBe("unreachable");
  });
});

describe("retries", () => {
  const options = { retries: 3, waitMs: 1, sleep: async () => undefined };
  it("asks again for a failure that can pass, and stops at once for a no", async () => {
    let calls = 0;
    expect(await withRetries(async () => { calls += 1; if (calls < 3) throw new Error("down"); return "ok"; }, { ...options, shouldRetry: () => true })).toBe("ok");
    calls = 0;
    await expect(withRetries(async () => { calls += 1; throw new Error("no"); }, { ...options, shouldRetry: () => false })).rejects.toThrow("no");
    expect(calls).toBe(1);
  });
});

describe("permission sync", () => {
  it("sends nothing when Central already has the list", async () => {
    let published = 0;
    const outcome = await syncPermissionsOnce(manifest, {
      list: async () => [row("a"), row("b", ["a"])],
      usage: async () => [],
      publish: async () => { published += 1; return sent; },
    });
    expect(outcome).toBe("in_sync");
    expect(published).toBe(0);
  });

  it("sends a new list without confirming removals", async () => {
    let confirm: unknown = "unset";
    const outcome = await syncPermissionsOnce(manifest, {
      list: async () => [row("a")],
      usage: async () => [],
      publish: async (_id, _list, confirmRemovals) => { confirm = confirmRemovals; return sent; },
    });
    expect(outcome).toBe("published");
    expect(confirm).toBe(false);
  });

  it("a no is final, an unreachable Central is waited out", async () => {
    const quiet = console.error;
    console.error = () => undefined;
    try {
      expect(await syncPermissionsOnce(manifest, {
        list: async () => [row("a")], usage: async () => [],
        publish: async () => { throw new CentralFailure("Central said no: drops", "rejected", 409); },
      })).toBe("refused");
      expect(await syncPermissionsOnce(manifest, {
        list: async () => { throw new CentralFailure("Central could not be reached", "unreachable"); }, usage: async () => [],
      })).toBe("waiting");
      expect(await syncPermissionsOnce(manifest, {
        list: async () => { throw new CentralFailure("Central does not have this yet, deploy Central first", "missing", 404); }, usage: async () => [],
      })).toBe("waiting");
    } finally {
      console.error = quiet;
    }
  });

  it("can be switched off", async () => {
    process.env.HUB_PERMISSION_SYNC = "off";
    expect(await syncPermissionsOnce(manifest, { list: async () => { throw new Error("no"); } })).toBe("off");
  });

  it("keeps asking while waiting and stops once it is done", async () => {
    const outcomes = ["waiting", "waiting", "published"] as const;
    let calls = 0;
    startPermissionSync(async () => outcomes[Math.min(calls++, 2)], 5);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(calls).toBe(3);
  });
});
