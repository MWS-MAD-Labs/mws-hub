import type { HubUser } from "./central-type";

// Central is what decides the signed-in person's identity, role and
// permission claims. Hub only states which Central-backed access keys may
// launch an app.
export type IdentitySource = HubUser["source"];
export type HubAccessSource = string;

export type HubAppStatus = "active" | "maintenance" | "coming_soon" | "new";

// Present only for apps that run their own /auth/sso exchange endpoint.
export type HubAppSso = {
  // Route key for /apps/:appId/launch, and the `aud` claim the receiving
  // app verifies. One value for both - they have never differed, and a
  // distinction nothing uses is just another thing to keep in sync.
  appId: string;
  entryUrl: string;
  // A satellite app's own session is a self-contained token on its own
  // origin (Hub's cookie clearing never reaches it) - if the app exposes a
  // no-UI page that clears its local session on load, Hub loads it in a
  // hidden iframe on logout so signing out of Hub actually signs out of
  // every app the person opened, not just Hub itself. Optional: an app
  // without one just doesn't get included in the logout fan-out.
  logoutUrl?: string;
};

export type HubCatalogEntry = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  audience: string;
  keywords: string[];
  href: string | null;
  external: boolean;
  status: HubAppStatus;
  // Display lever: false drops an app from the grid for everyone, for tools
  // a normal user should not even know about. Distinct from allowedSources,
  // which is the access lever - a hidden app is still launchable by someone
  // who has its URL and is admitted below.
  discoverable: boolean;
  // Deny by default. Values are Central-backed access keys: identity source
  // (`student`, `employee`), role/audience keys (`teacher`, `admin`, ...),
  // or `public` for every active Central user.
  allowedSources: HubAccessSource[];
  sso?: HubAppSso;
};

// What GET /apps hands the browser. Policy details stay server-side: the
// client never receives the raw allowedSources, only whether this person can
// open the card or should see the request-access path.
export type HubAppResponse = Omit<HubCatalogEntry, "allowedSources" | "sso"> & {
  access: "granted" | "locked";
  ssoAppId?: string;
};
