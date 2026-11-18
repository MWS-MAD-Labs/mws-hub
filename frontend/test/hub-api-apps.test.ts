import { afterEach, describe, expect, it } from "bun:test";
import { hubApi } from "../src/features/hub/api/hubApi";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const answer = (body: unknown) => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
};

// The server says when Central could not be asked for some cards, so a short menu is not mistaken for "no apps".
describe("hubApi.listApplications", () => {
  it("passes on that Central could not be asked, with the wait it named", async () => {
    answer({ data: [], meta: { central_unavailable: true, retry_after_seconds: 12 } });
    expect(await hubApi.listApplications()).toEqual({ applications: [], unavailable: { retryAfterSeconds: 12 } });
  });

  it("has no warning when the answer carries none", async () => {
    answer({ data: [{ id: "daily-checkin" }] });
    const result = await hubApi.listApplications();
    expect(result.unavailable).toBeNull();
    expect(result.applications).toHaveLength(1);
  });

  it("allows a missing wait", async () => {
    answer({ data: [], meta: { central_unavailable: true } });
    expect((await hubApi.listApplications()).unavailable).toEqual({ retryAfterSeconds: null });
  });
});
