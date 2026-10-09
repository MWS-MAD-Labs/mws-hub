import { env } from "@/config/env";

const hasProtocol = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
const isLocalHost = (value: string) => /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value);

export function normalizeApplicationUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (hasProtocol(trimmed)) {
    const parsed = new URL(trimmed);
    if (env.deployEnvironment !== "development" && parsed.protocol === "http:" && !isLocalHost(parsed.host)) parsed.protocol = "https:";
    return parsed.toString().replace(/\/$/, trimmed.endsWith("/") ? "/" : "");
  }
  const protocol = env.deployEnvironment === "development" || isLocalHost(trimmed) ? "http" : "https";
  return `${protocol}://${trimmed}`;
}

export function displayApplicationUrl(value: string | null | undefined): string {
  return (value || "").replace(/^https?:\/\//i, "");
}
