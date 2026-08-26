import { describe, it, expect, afterEach } from "bun:test";
import { resolveCentralIdentity } from "../lib/central-client";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("resolveCentralIdentity", () => {
  it("returns an employee identity when the employee lookup finds a match", async () => {
    global.fetch = (async () =>
      jsonResponse(200, {
        data: { id: "emp-1", email: "a@millennia21.id" },
      })) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("a@millennia21.id");
    expect(user?.source).toBe("employee");
  });

  it("falls through to the student lookup when the employee isn't found", async () => {
    const calls: string[] = [];
    global.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/employees/lookup")) return jsonResponse(404, { errors: "Not found" });
      return jsonResponse(200, { data: { id: "stu-1", email: "b@millennia21.id" } });
    }) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("b@millennia21.id");
    expect(user?.source).toBe("student");
    expect(calls.some((url) => url.includes("/employees/lookup"))).toBe(true);
    expect(calls.some((url) => url.includes("/students/lookup"))).toBe(true);
  });

  it("returns null when neither employees nor students has a match", async () => {
    global.fetch = (async () =>
      jsonResponse(404, { errors: "Not found" })) as unknown as typeof fetch;

    const user = await resolveCentralIdentity("nobody@millennia21.id");
    expect(user).toBeNull();
  });

  // Regression check for the exact failure this backend hit in the wild:
  // Central's api_clients/api_scopes tables were empty, so every lookup came
  // back 401 instead of 404 - and that must surface as a loud error, not a
  // silent "user not found".
  it("throws instead of treating a 401 as 'not found', so an auth misconfiguration is never silent", async () => {
    global.fetch = (async () =>
      jsonResponse(401, { errors: "Unauthorized" })) as unknown as typeof fetch;

    await expect(resolveCentralIdentity("anyone@millennia21.id")).rejects.toThrow(
      "Central lookup failed with status 401",
    );
  });

  it("throws on an unexpected 5xx from Central rather than returning null", async () => {
    global.fetch = (async () =>
      jsonResponse(500, { errors: "Internal error" })) as unknown as typeof fetch;

    await expect(resolveCentralIdentity("anyone@millennia21.id")).rejects.toThrow(
      "Central lookup failed with status 500",
    );
  });
});
