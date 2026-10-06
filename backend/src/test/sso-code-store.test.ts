import { describe, it, expect } from "bun:test";
import { MemorySsoCodeStore } from "../lib/sso-code-store";

describe("MemorySsoCodeStore", () => {
  it("returns the minted token for the right app and is single-use", async () => {
    const store = new MemorySsoCodeStore();
    const code = await store.create("jwt-1", "daily-checkin");
    expect(await store.consume(code, "daily-checkin")).toBe("jwt-1");
    expect(await store.consume(code, "daily-checkin")).toBeNull();
  });

  it("burns a code redeemed by the wrong app", async () => {
    const store = new MemorySsoCodeStore();
    const code = await store.create("jwt-1", "daily-checkin");
    expect(await store.consume(code, "other-app")).toBeNull();
    expect(await store.consume(code, "daily-checkin")).toBeNull();
  });

  it("requires matching state only when the code was state-bound", async () => {
    const store = new MemorySsoCodeStore();
    const bound = await store.create("jwt-1", "exima", "caller-state");
    expect(await store.consume(bound, "exima", "caller-state")).toBe("jwt-1");

    const unbound = await store.create("jwt-2", "exima");
    expect(await store.consume(unbound, "exima", "ignored-state")).toBe("jwt-2");
  });

  it("burns a state-bound code after missing or wrong state", async () => {
    const store = new MemorySsoCodeStore();
    const code = await store.create("jwt-1", "exima", "caller-state");
    expect(await store.consume(code, "exima")).toBeNull();
    expect(await store.consume(code, "exima", "caller-state")).toBeNull();
  });
});
