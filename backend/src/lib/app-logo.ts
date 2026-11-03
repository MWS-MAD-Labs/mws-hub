import * as central from "./central-client";

const MAX_KEPT = 100;
const kept = new Map<string, { buffer: Buffer; contentType: string }>();

export function clearAppLogosForTest() {
  kept.clear();
}

// The picture of a card, kept by application and version: a new version is a new picture, so it is fetched once.
async function logoOf(applicationId: string, version: number) {
  const key = `${applicationId}:${version}`;
  const known = kept.get(key);
  if (known) return known;
  const fetched = await central.fetchApplicationLogo(applicationId);
  if (!fetched) return null;
  if (kept.size >= MAX_KEPT) kept.delete(kept.keys().next().value as string);
  kept.set(key, fetched);
  return fetched;
}

// What the Hub answers when a card asks for its logo: the picture, a 304 when the browser has this version, or a 404.
export async function answerAppLogo(
  entry: { id: string; logo?: { version: number } } | null,
  ifNoneMatch: string | undefined,
): Promise<{ status: 200 | 304 | 404; headers: Record<string, string>; body?: Buffer }> {
  if (!entry?.logo) return { status: 404, headers: {} };
  const etag = `"v${entry.logo.version}"`;
  const headers = { ETag: etag, "Cache-Control": "private, max-age=3600" };
  if (ifNoneMatch === etag) return { status: 304, headers };
  const image = await logoOf(entry.id, entry.logo.version);
  if (!image) return { status: 404, headers: {} };
  return { status: 200, headers: { ...headers, "Content-Type": image.contentType }, body: image.buffer };
}
