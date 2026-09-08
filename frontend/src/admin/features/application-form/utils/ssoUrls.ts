// The SSO entry point is always the app service origin plus /auth/sso. Some
// apps, like Daily Check-in, land on a frontend route after SSO (/select-role);
// strip that landing route back off so it never becomes /select-role/auth/sso.
const SSO_BASE_SUFFIXES = [
  /\/auth\/sso\/?$/i,
  /\/auth\/logout-silent\/?$/i,
  /\/select-role\/?$/i,
];

export function normalizeSsoBase(base: string): string {
  let trimmed = base.trim().replace(/\/+$/, "");
  let changed = true;

  while (changed) {
    changed = false;
    for (const suffix of SSO_BASE_SUFFIXES) {
      const next = trimmed.replace(suffix, "");
      if (next !== trimmed) {
        trimmed = next.replace(/\/+$/, "");
        changed = true;
      }
    }
  }

  return trimmed;
}

export function ssoEntryFromBase(base: string): string {
  const trimmed = normalizeSsoBase(base);
  return trimmed ? `${trimmed}/auth/sso` : "";
}

// Same base as the entry point: an app that runs its own no-UI "clear my
// local session" page for Hub's logout fan-out exposes it at this fixed
// path, so there is nothing extra to ask for here either.
export function ssoLogoutFromBase(base: string): string {
  const trimmed = normalizeSsoBase(base);
  return trimmed ? `${trimmed}/auth/logout-silent` : "";
}

export function baseFromSsoEntry(entry: string): string {
  return normalizeSsoBase(entry);
}

// Falls back to the app's own id when no SSO-specific code was typed in -
// the common case where the SSO audience matches the app id exactly.
export function resolveSsoAppId(
  appId: string,
  rawSsoAppId?: string | null,
): string {
  return (rawSsoAppId ?? "").trim() || appId;
}
