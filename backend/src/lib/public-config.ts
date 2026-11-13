// The address of the real Hub. Set only on the staging deploy, so the Hub can say it is a test version.
// Anything that is not a web address is ignored.
export function productionUrl(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.PRODUCTION_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

// What GET /api/public-config answers. Under /api because that is a prefix nginx and the dev proxy pass on to the backend.
export const publicConfig = (env: Record<string, string | undefined> = process.env) => ({
  data: { production_url: productionUrl(env) },
});
