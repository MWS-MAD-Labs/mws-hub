import { describe, expect, it } from "bun:test";
import { MIN_SESSION_SECONDS, sessionEndsAt, sessionSecondsLeft } from "../lib/session-expiry";

// Times are written in WIB (+07:00); the session should end Saturday 00:00 WIB.
const wib = (iso: string) => new Date(`${iso}+07:00`).getTime();
const END_OF_WEEK = "2026-11-07T00:00:00.000+07:00"; // Saturday after Fri 6 Nov 2026

describe("sessionEndsAt", () => {
  it.each([
    ["Monday morning", "2026-11-02T08:00:00"],
    ["Wednesday noon", "2026-11-04T12:00:00"],
    ["Thursday late night", "2026-11-05T23:59:00"],
    ["Friday morning", "2026-11-06T07:30:00"],
  ])("a sign-in on %s lasts until the end of Friday", (_label, at) => {
    expect(sessionEndsAt(wib(at)).getTime()).toBe(new Date(END_OF_WEEK).getTime());
  });

  it("Monday 00:30 WIB (still Sunday in UTC) ends this Friday, not last week", () => {
    expect(sessionEndsAt(wib("2026-11-02T00:30:00")).getTime()).toBe(new Date(END_OF_WEEK).getTime());
  });

  it.each([
    ["Saturday", "2026-11-07T10:00:00"],
    ["Sunday", "2026-11-08T20:00:00"],
    ["Saturday 00:00 sharp", "2026-11-07T00:00:00"],
  ])("a sign-in on %s lasts until the next Friday", (_label, at) => {
    expect(sessionEndsAt(wib(at)).getTime()).toBe(new Date("2026-11-14T00:00:00.000+07:00").getTime());
  });

  it("late on Friday it still keeps the minimum", () => {
    const now = wib("2026-11-06T22:00:00");
    expect(sessionEndsAt(now).getTime()).toBe(now + MIN_SESSION_SECONDS * 1000);
  });

  it("sessionSecondsLeft matches sessionEndsAt", () => {
    const now = wib("2026-11-04T12:00:00");
    expect(sessionSecondsLeft(now)).toBe((new Date(END_OF_WEEK).getTime() - now) / 1000);
  });
});
