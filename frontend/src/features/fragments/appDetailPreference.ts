// "Don't show this again" on the app detail popup: one global flag in this
// browser. Any storage failure counts as "show the popup".
const SKIP_APP_DETAIL_KEY = "hub:skip-app-detail";

export const shouldSkipAppDetail = (): boolean => {
  try {
    return window.localStorage.getItem(SKIP_APP_DETAIL_KEY) === "1";
  } catch {
    return false;
  }
};

// Returns whether the choice was stored.
export const setSkipAppDetail = (skip: boolean): boolean => {
  try {
    if (skip) window.localStorage.setItem(SKIP_APP_DETAIL_KEY, "1");
    else window.localStorage.removeItem(SKIP_APP_DETAIL_KEY);
    return true;
  } catch {
    return false;
  }
};
