import { describe, expect, it } from "bun:test";
import { productionUrl, publicConfig } from "../lib/public-config";

describe("productionUrl", () => {
  it("is empty when nothing is set", () => {
    expect(productionUrl({})).toBeNull();
    expect(productionUrl({ PRODUCTION_URL: "   " })).toBeNull();
  });

  it("drops the trailing slash and keeps the address", () => {
    expect(productionUrl({ PRODUCTION_URL: "https://hub.example.org/" })).toBe("https://hub.example.org");
    expect(productionUrl({ PRODUCTION_URL: " https://hub.example.org " })).toBe("https://hub.example.org");
  });

  it("ignores what is not a web address", () => {
    expect(productionUrl({ PRODUCTION_URL: "hub.example.org" })).toBeNull();
    expect(productionUrl({ PRODUCTION_URL: "javascript:alert(1)" })).toBeNull();
  });
});

describe("publicConfig", () => {
  it("answers in the shape the banner reads", () => {
    expect(publicConfig({})).toEqual({ data: { production_url: null } });
    expect(publicConfig({ PRODUCTION_URL: "https://hub.example.org/" })).toEqual({ data: { production_url: "https://hub.example.org" } });
  });
});
