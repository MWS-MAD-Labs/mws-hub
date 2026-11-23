import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
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

  it("uses versioned install icon URLs so existing PWAs can detect a logo update", () => {
    const config = read("vite.config.ts");
    const html = read("index.html");
    const icons = [
      "mws-hub-v2-192x192.png",
      "mws-hub-v2-512x512.png",
      "mws-hub-v2-maskable-192x192.png",
      "mws-hub-v2-maskable-512x512.png",
    ];

    for (const icon of icons) {
      expect(config).toContain(`/${icon}`);
      expect(existsSync(join(import.meta.dir, "..", "public", icon))).toBe(true);
    }
    expect(html).toContain("/mws-hub-v2-192x192.png");
    expect(html).toContain("/mws-hub-v2-apple-touch-icon.png");
  });
});
