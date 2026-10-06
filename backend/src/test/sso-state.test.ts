import { describe, expect, it } from "bun:test";
import { optionalSsoState, sanitizeLaunchRedirect } from "../lib/sso-state";

describe("SSO state", () => {
  it("accepts URL-safe state and preserves it in a validated launch redirect", () => {
    expect(optionalSsoState("return_abc-123.~")).toBe("return_abc-123.~");
    expect(sanitizeLaunchRedirect("/apps/exima/launch?state=return_abc-123.~")).toBe(
      "/apps/exima/launch?state=return_abc-123.~",
    );
  });

  it("rejects empty, oversized, or non URL-safe state", () => {
    expect(() => optionalSsoState("")).toThrow();
    expect(() => optionalSsoState("x".repeat(513))).toThrow();
    expect(() => optionalSsoState("spaces are not allowed")).toThrow();
  });

  it("rejects external redirects, extra query keys, duplicate state, and fragments", () => {
    expect(sanitizeLaunchRedirect("https://evil.test/apps/exima/launch")).toBeNull();
    expect(sanitizeLaunchRedirect("/apps/exima/launch?next=/evil")).toBeNull();
    expect(sanitizeLaunchRedirect("/apps/exima/launch?state=one&state=two")).toBeNull();
    expect(sanitizeLaunchRedirect("/apps/exima/launch#fragment")).toBeNull();
  });
});
