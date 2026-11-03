import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as centralClient from "../lib/central-client";
import { answerAppLogo, clearAppLogosForTest } from "../lib/app-logo";
import { toCentralEntry } from "../service/central-catalog-service";

const image = { buffer: Buffer.from("webp-bytes"), contentType: "image/webp" };

describe("the logo of a card", () => {
  beforeEach(() => clearAppLogosForTest());
  afterEach(() => {
    spyOn(centralClient, "fetchApplicationLogo").mockRestore();
  });

  it("is part of the card Central published, by version", () => {
    const entry = toCentralEntry({
      id: "exima",
      name: "Exima",
      description: null,
      icon: null,
      category: null,
      launch_url: "https://exima.example.com/auth/sso",
      logout_url: null,
      logo: { version: 3 },
    });
    expect(entry.logo).toEqual({ version: 3 });
    expect(toCentralEntry({ id: "x", name: "X", description: null, icon: "Cash", category: null, launch_url: "https://x.example.com", logout_url: null }).logo).toBeUndefined();
  });

  it("is fetched from Central once per version and served from memory after", async () => {
    const fetch = spyOn(centralClient, "fetchApplicationLogo").mockResolvedValue(image);
    const first = await answerAppLogo({ id: "exima", logo: { version: 1 } }, undefined);
    const second = await answerAppLogo({ id: "exima", logo: { version: 1 } }, undefined);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(first.headers["Content-Type"]).toBe("image/webp");
    expect(first.headers.ETag).toBe('"v1"');
    expect(fetch).toHaveBeenCalledTimes(1);

    await answerAppLogo({ id: "exima", logo: { version: 2 } }, undefined);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("answers 304 without asking Central when the browser already has this version", async () => {
    const fetch = spyOn(centralClient, "fetchApplicationLogo").mockResolvedValue(image);
    const answer = await answerAppLogo({ id: "exima", logo: { version: 4 } }, '"v4"');
    expect(answer.status).toBe(304);
    expect(answer.body).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 404 for a card without a logo, or when Central has none", async () => {
    spyOn(centralClient, "fetchApplicationLogo").mockResolvedValue(null);
    expect((await answerAppLogo(null, undefined)).status).toBe(404);
    expect((await answerAppLogo({ id: "exima" }, undefined)).status).toBe(404);
    expect((await answerAppLogo({ id: "exima", logo: { version: 1 } }, undefined)).status).toBe(404);
  });
});
