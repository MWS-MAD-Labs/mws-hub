import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (file: string) => readFileSync(join(import.meta.dir, "..", file), "utf8");

// Cloudflare held an old /sw.js for hours, so the fixed worker never reached browsers. The worker has a new name and
// is never cached.
describe("service worker caching", () => {
  const nginx = read("nginx.conf");
  const block = (location: string) => {
    const start = nginx.indexOf(location);
    expect(start).toBeGreaterThan(-1);
    return nginx.slice(start, nginx.indexOf("}", start));
  };

  it("registers the worker under its own name", () => {
    expect(read("vite.config.ts")).toContain('filename: "hub-sw.js"');
  });

  it("serves the worker and the files that start it with no-store", () => {
    for (const location of ["location = /hub-sw.js", "location = /registerSW.js", "location = /index.html", "location = /manifest.webmanifest"]) {
      expect(block(location)).toContain("no-cache, no-store, must-revalidate");
    }
    expect(block("location ~ ^/workbox-")).toContain("no-store");
  });

  it("answers 404 for the old worker name", () => {
    expect(block("location = /sw.js")).toContain("return 404");
  });
});
