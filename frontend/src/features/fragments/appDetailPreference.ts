// "Don't show this again" belongs to the app that was opened, not the whole
// Hub. Keeping the ids together also lets Profile reset every hidden detail.
const SKIPPED_APP_DETAILS_KEY = "hub:skipped-app-details";

const readSkippedAppIds = (): string[] => {
  try {
    const stored = window.localStorage.getItem(SKIPPED_APP_DETAILS_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};

export const shouldSkipAppDetail = (appId: string): boolean =>
  readSkippedAppIds().includes(appId);

// Returns whether the choice was stored.
export const setSkipAppDetail = (appId: string, skip: boolean): boolean => {
  try {
    const skippedIds = new Set(readSkippedAppIds());
    if (skip) skippedIds.add(appId);
    else skippedIds.delete(appId);

    if (skippedIds.size > 0) {
      window.localStorage.setItem(
        SKIPPED_APP_DETAILS_KEY,
        JSON.stringify([...skippedIds]),
      );
    } else {
      window.localStorage.removeItem(SKIPPED_APP_DETAILS_KEY);
    }
    return true;
  } catch {
    return false;
  }
};

export const skippedAppDetailCount = (): number => readSkippedAppIds().length;

export const clearSkippedAppDetails = (): boolean => {
  try {
    window.localStorage.removeItem(SKIPPED_APP_DETAILS_KEY);
    return true;
  } catch {
    return false;
  }
};
