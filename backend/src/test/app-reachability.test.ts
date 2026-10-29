import { beforeEach, describe, expect, it } from "bun:test";
import { forgetReachability, isAppReachable } from "../lib/app-reachability";

beforeEach(() => forgetReachability());

const answers = (status: number) => async () => new Response(null, { status });
const refuses = async () => {
  throw new TypeError("fetch failed: ECONNREFUSED");
};

describe("isAppReachable", () => {
  it("counts any HTTP answer as up, even an error status", async () => {
    expect(await isAppReachable("https://app.example.org/auth/sso", { fetcher: answers(200) })).toBe(true);
    forgetReachability();
    expect(await isAppReachable("https://app.example.org/auth/sso", { fetcher: answers(401) })).toBe(true);
    forgetReachability();
    expect(await isAppReachable("https://app.example.org/auth/sso", { fetcher: answers(404) })).toBe(true);
  });

  it("counts a refused connection or no answer in time as down", async () => {
    expect(await isAppReachable("http://localhost:5999/auth/sso", { fetcher: refuses })).toBe(false);
  });

  it("asks the origin, not the path", async () => {
    const asked: string[] = [];
    await isAppReachable("https://app.example.org/auth/sso?x=1", {
      fetcher: async (input) => {
        asked.push(input);
        return new Response(null, { status: 200 });
      },
    });
    expect(asked).toEqual(["https://app.example.org"]);
  });

  it("keeps the answer for a few seconds and asks again after", async () => {
    let calls = 0;
    let time = 1_000;
    const fetcher = async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    };
    const options = { fetcher, now: () => time };
    await isAppReachable("https://app.example.org/", options);
    await isAppReachable("https://app.example.org/other", options);
    expect(calls).toBe(1);
    time += 16_000;
    await isAppReachable("https://app.example.org/", options);
    expect(calls).toBe(2);
  });

  it("does not block on an address it cannot probe", async () => {
    expect(await isAppReachable("not a url", { fetcher: refuses })).toBe(true);
  });
});
