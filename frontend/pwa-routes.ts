// Paths the browser must always ask the network for, never answer with the Hub's cached index.html. The first group is
// served by the Hub server, the second by other apps behind the same gateway (see docker-compose-gateway.yml). A card
// that opens /mtss/auth/sso would otherwise show a blank Hub page, because the service worker catches the navigation.
export const SERVER_PREFIXES = ["/auth", "/apps", "/sso", "/admin/dashboard-data", "/admin/api", "/.well-known", "/env.js"];
export const GATEWAY_APP_PREFIXES = ["/mtss", "/daily-checkin"];

const startsAt = (prefix: string) => `^${prefix.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`;

// Navigation denylist for the service worker. The app prefixes only match a whole path segment.
export const NAVIGATION_DENYLIST: RegExp[] = [
  ...SERVER_PREFIXES.map((prefix) => new RegExp(prefix === "/admin/dashboard-data" ? `${startsAt(prefix)}$` : startsAt(prefix))),
  ...GATEWAY_APP_PREFIXES.map((prefix) => new RegExp(`${startsAt(prefix)}(\\/|$)`)),
];

export const NETWORK_ONLY_PREFIXES = [...SERVER_PREFIXES, ...GATEWAY_APP_PREFIXES];
