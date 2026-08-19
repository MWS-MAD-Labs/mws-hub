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

// TODO(fase-3): replace with the real session shape once the Hub has its
// own Google Workspace login + central-DB role lookup wired up.
export type HubUser = {
  name: string;
  email: string;
  role: string;
};
