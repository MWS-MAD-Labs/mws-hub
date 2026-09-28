import { describe, it, expect } from "bun:test";
import { createSsoCode, consumeSsoCode } from "../lib/sso-code-store";

describe("sso-code-store", () => {
  it("returns the minted token for a code redeemed by the right app", () => {
    const code = createSsoCode("jwt-1", "daily-checkin");
    expect(consumeSsoCode(code, "daily-checkin")).toBe("jwt-1");
  });

  it("is single-use - a second redemption of the same code fails", () => {
    const code = createSsoCode("jwt-1", "daily-checkin");
    expect(consumeSsoCode(code, "daily-checkin")).toBe("jwt-1");
    expect(consumeSsoCode(code, "daily-checkin")).toBeNull();
  });

  it("refuses a code redeemed by a different app than it was minted for", () => {
    const code = createSsoCode("jwt-1", "daily-checkin");
    expect(consumeSsoCode(code, "some-other-app")).toBeNull();
  });

  // The mismatched-app attempt above must not leave the code redeemable by
  // the right app afterwards - a wrong guess still consumes it.
  it("consumes the code even when the app check fails, so a guess can't be retried", () => {
    const code = createSsoCode("jwt-1", "daily-checkin");
    consumeSsoCode(code, "some-other-app");
    expect(consumeSsoCode(code, "daily-checkin")).toBeNull();
  });

  it("returns null for a code that was never minted", () => {
    expect(consumeSsoCode("never-existed", "daily-checkin")).toBeNull();
  });

  it("mints a different code every time, even for the same token/app", () => {
    const codeA = createSsoCode("jwt-1", "daily-checkin");
    const codeB = createSsoCode("jwt-1", "daily-checkin");
    expect(codeA).not.toBe(codeB);
  });
});
