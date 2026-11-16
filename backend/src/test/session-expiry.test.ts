import { describe, expect, it } from "bun:test";
import { SESSION_SECONDS, sessionEndsAt, sessionSecondsLeft } from "../lib/session-expiry";

describe("sessionEndsAt", () => {
  it.each([
    ["Monday", "2026-11-02T08:00:00+07:00"],
    ["Friday night", "2026-11-06T22:00:00+07:00"],
    ["Sunday", "2026-11-08T20:00:00+07:00"],
  ])("a sign-in on %s lasts 7 days", (_label, at) => {
    const now = new Date(at).getTime();
    expect(sessionEndsAt(now).getTime()).toBe(now + 7 * 24 * 3600 * 1000);
  });

  it("sessionSecondsLeft is 7 days", () => {
    expect(sessionSecondsLeft(Date.now())).toBe(SESSION_SECONDS);
  });
});
