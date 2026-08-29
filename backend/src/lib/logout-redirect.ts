import { ApplicationService } from "../service/application-service";
import { frontendOrigin } from "./frontend-origin";

// Where a satellite is allowed to send the browser after Hub has cleared its
// session. Without this check the logout endpoint is an open redirect: any
// site could link to /auth/logout?redirect=https://evil.example and borrow
// Hub's domain to make the hop look legitimate.
//
// The allowlist is derived from the catalog rather than configured
// separately, so registering an app - now only ever done through the admin
// screen, see ApplicationService - is the only thing needed to let it round
// trip. One list, no second place to keep in sync.

function originOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

async function allowedOrigins(): Promise<Set<string>> {
  const origins = new Set<string>();

  const own = originOf(frontendOrigin());
  if (own) origins.add(own);

  const catalog = await ApplicationService.listActive();
  for (const entry of catalog) {
    const href = originOf(entry.href);
    if (href) origins.add(href);

    const sso = originOf(entry.sso?.entryUrl);
    if (sso) origins.add(sso);
  }

  return origins;
}

// Returns a safe absolute URL to redirect to, or null when the caller should
// fall back to Hub's own front page. Anything unparseable, relative, or from
// an origin Hub does not know is rejected rather than sanitised - a partial
// match is exactly how open redirects slip through.
export async function resolveLogoutRedirect(
  raw: string | undefined,
): Promise<string | null> {
  if (!raw) return null;

  const origin = originOf(raw);
  if (!origin) return null;

  return (await allowedOrigins()).has(origin) ? raw : null;
}
