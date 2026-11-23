import type { Context } from "hono";

const MAX_USER_AGENT_LENGTH = 500;

export type DeviceMetadata = {
  deviceName: string;
  userAgent: string | null;
};

function browserName(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Browser";
}

function platformName(userAgent: string): string {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/Windows/.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Unknown device";
}

export function deviceMetadata(c: Context): DeviceMetadata {
  const raw = c.req.header("user-agent")?.trim().slice(0, MAX_USER_AGENT_LENGTH) || null;
  return {
    deviceName: raw ? `${browserName(raw)} on ${platformName(raw)}` : "Unknown device",
    userAgent: raw,
  };
}
