import { describe, expect, it } from "bun:test";
import { isServerPath, sanitizeRedirectPath } from "../src/lib/redirect-path";

describe("isServerPath", () => {
  it("knows the paths the Hub server answers itself", () => {
    expect(isServerPath("/apps/exima/launch?state=abc")).toBe(true);
    expect(isServerPath("/apps/exima/launch")).toBe(true);
    expect(isServerPath("/sso/exchange")).toBe(true);
    expect(isServerPath("/auth/logout?redirect=/x")).toBe(true);
  });

  it("leaves pages of the single page app alone", () => {
    expect(isServerPath("/support-hub")).toBe(false);
    expect(isServerPath("/profile")).toBe(false);
    expect(isServerPath("/admin/applications")).toBe(false);
    expect(isServerPath("/applications-guide")).toBe(false);
  });
});

describe("sanitizeRedirectPath", () => {
  it("accepts a same-origin relative path only", () => {
    expect(sanitizeRedirectPath("/apps/exima/launch?state=x")).toBe("/apps/exima/launch?state=x");
    expect(sanitizeRedirectPath("//evil.example")).toBeNull();
    expect(sanitizeRedirectPath("https://evil.example")).toBeNull();
    expect(sanitizeRedirectPath("apps/x")).toBeNull();
    expect(sanitizeRedirectPath(null)).toBeNull();
  });
});
