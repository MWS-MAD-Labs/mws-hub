import { describe, expect, it } from "bun:test";
import { NAVIGATION_DENYLIST, NETWORK_ONLY_PREFIXES } from "../pwa-routes";

const denied = (path: string) => NAVIGATION_DENYLIST.some((pattern) => pattern.test(path));

describe("service worker navigation denylist", () => {
  it("lets the apps behind the gateway and the server paths through to the network", () => {
    for (const path of [
      "/mtss/auth/sso",
      "/mtss/",
      "/mtss",
      "/daily-checkin/x",
      "/sso/exchange",
      "/auth/logout",
      "/apps/exima/launch",
      "/admin/dashboard-data",
      "/admin/api/x",
      "/api/gpt-code/account",
      "/env.js",
    ]) {
      expect(denied(path)).toBe(true);
    }
  });

  it("keeps answering the pages of the Hub itself with the app shell", () => {
    for (const path of ["/", "/support-hub", "/profile", "/admin/applications", "/mtssfoo", "/admin/dashboard-data/x"]) {
      expect(denied(path)).toBe(false);
    }
  });

  it("keeps the runtime NetworkOnly list in step", () => {
    expect(NETWORK_ONLY_PREFIXES).toContain("/mtss");
    expect(NETWORK_ONLY_PREFIXES).toContain("/daily-checkin");
    expect(NETWORK_ONLY_PREFIXES).toContain("/sso");
    expect(NETWORK_ONLY_PREFIXES).toContain("/api");
  });
});
