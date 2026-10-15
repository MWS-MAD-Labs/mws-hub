import { describe, expect, it } from "bun:test";
import { appEndpoints } from "../lib/app-endpoints";

describe("appEndpoints", () => {
  it("makes the same pair from /auth/logout and /auth/logout-silent", () => {
    const expected = {
      silent: "https://app.test/auth/logout-silent",
      revoke: "https://app.test/auth/revoke-session",
    };
    expect(appEndpoints("https://app.test/auth/logout")).toEqual(expected);
    expect(appEndpoints("https://app.test/auth/logout-silent")).toEqual(expected);
  });

  it("keeps a gateway prefix and the port", () => {
    expect(appEndpoints("http://localhost:3003/daily-checkin/auth/logout")).toEqual({
      silent: "http://localhost:3003/daily-checkin/auth/logout-silent",
      revoke: "http://localhost:3003/daily-checkin/auth/revoke-session",
    });
  });

  it("gives nothing for an address it cannot read", () => {
    expect(appEndpoints("https://app.test/somewhere/else")).toBeNull();
    expect(appEndpoints("not an address")).toBeNull();
    expect(appEndpoints("ftp://app.test/auth/logout")).toBeNull();
  });
});
