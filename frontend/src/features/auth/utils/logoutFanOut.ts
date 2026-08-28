import { loadHiddenIframe } from "@/lib/hiddenIframe";

export async function fanOutLogout(urls: string[], timeoutMs = 1500): Promise<void> {
  if (!urls.length) return;
  await Promise.all(urls.map((url) => loadHiddenIframe(url, timeoutMs)));
}
