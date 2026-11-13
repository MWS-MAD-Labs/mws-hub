import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// A path the browser asks the Hub server for has to be one nginx passes on to the backend. Any other path is answered
// with index.html, which is HTML with status 200, so the call quietly gets nothing (the staging banner once hit this).
const proxied = [...readFileSync(join(import.meta.dir, "../nginx.conf"), "utf8").matchAll(/location\s+(?:=\s+|~\s+)?(\/[^\s{]*)/g)]
  .map((match) => match[1]!)
  .filter((prefix) => prefix !== "/");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("paths the frontend asks the Hub server for", () => {
  it("are all passed on to the backend by nginx", () => {
    const calls = sourceFiles(join(import.meta.dir, "../src")).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/apiRequest(?:<[^()]*?>)?\(\s*[`"'](\/[^`"'?$]*)/g)].map((match) => ({ file, path: match[1]! })),
    );
    expect(calls.length).toBeGreaterThan(5);
    const unreachable = calls.filter(({ path }) => !proxied.some((prefix) => path.startsWith(prefix.replace(/\/$/, ""))));
    expect(unreachable).toEqual([]);
  });

  it("includes the path of the staging banner", () => {
    const banner = readFileSync(join(import.meta.dir, "../src/components/EnvironmentBanner.tsx"), "utf8");
    expect(banner).toContain('"/api/public-config"');
  });
});
