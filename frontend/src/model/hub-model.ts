export type HubApplicationStatus = "active" | "maintenance" | "coming_soon" | "new";
export type HubApplicationAccess = "granted" | "locked";

export type HubApplication = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  audience: string;
  keywords: string[];
  href: string | null;
  external: boolean;
  status: HubApplicationStatus;
  access: HubApplicationAccess;
  discoverable: boolean;
  // Set only for apps with a token-relay SSO exchange endpoint (see
  // mws-hub/backend's src/lib/sso-relay.ts SSO_APPS). When present, AppCard
  // routes the click through Hub's own /apps/:id/launch instead of `href`
  // directly, so the user lands in already logged in.
  ssoAppId?: string;
};

export type HubCategoryTone = "violet" | "sky" | "emerald" | "amber" | "slate" | "neutral";

export type HubCategory = {
  id: string;
  label: string;
  tone: HubCategoryTone;
};

// What useHubCatalog hands to CategoryFilter - the "all" pseudo-category has
// no tone (tone only colors AppCard icons, never the filter row itself).
export type HubCategoryFilterOption = {
  id: string;
  label: string;
  count: number;
};

// UI-facing shape HubHeader/etc render - see model/auth-model.ts's
// toHubUser() for how this gets derived from a real Central identity.
export type HubUser = {
  name: string;
  email: string;
  role: string;
};
