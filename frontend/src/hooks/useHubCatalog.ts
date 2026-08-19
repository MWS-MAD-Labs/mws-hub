import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HUB_APPLICATIONS } from "@/data/hubApplications";
import { HUB_CATEGORIES, getCategoryLabel } from "@/data/hubCategories";
import type { HubApplication, HubCategoryFilterOption } from "@/model/hub-model";

// Mock latency so the skeleton state is real code that runs, not a branch
// nobody ever sees. Replace this with the catalog fetch later.
const MOCK_LOAD_MS = 550;

const normalize = (value = ""): string => String(value || "").toLowerCase().trim();

// Keywords are how one app stays findable from several angles without
// belonging to two categories at once - "drive", "batch" and "pdf" all reach
// Slides to PDF, but it still lives in exactly one bucket in the rail.
const matchesQuery = (app: HubApplication, query: string): boolean => {
  if (!query) return true;
  const haystack = [app.name, app.description, getCategoryLabel(app.category), ...(app.keywords || [])]
    .map(normalize)
    .join(" ");
  return haystack.includes(query);
};

export type UseHubCatalogResult = {
  isLoading: boolean;
  hasError: boolean;
  categories: HubCategoryFilterOption[];
  activeCategory: string;
  query: string;
  isFiltering: boolean;
  visibleApplications: HubApplication[];
  lockedCount: number;
  hasCatalog: boolean;
  setQuery: (value: string) => void;
  setCategory: (value: string) => void;
  clearFilters: () => void;
  retry: () => void;
};

// Search and category live in the URL so a filtered hub can be shared and
// survives a refresh - the same reason the dashboards here do it.
export default function useHubCatalog(): UseHubCatalogResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  // ?mockError=1 forces the failure branch. The real fetch will set this
  // from a rejected request; until then the error state needs a way to be
  // reviewed without editing code.
  const hasError = searchParams.get("mockError") === "1";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsLoading(false), MOCK_LOAD_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const query = normalize(searchParams.get("q") || "");
  const rawQuery = searchParams.get("q") || "";
  const activeCategory = searchParams.get("cat") || "all";

  const updateParams = useCallback(
    (patch: Record<string, string>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (!value || value === "all") next.delete(key);
            else next.set(key, value);
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setQuery = useCallback((value: string) => updateParams({ q: value }), [updateParams]);
  const setCategory = useCallback((value: string) => updateParams({ cat: value }), [updateParams]);
  const clearFilters = useCallback(() => updateParams({ q: "", cat: "all" }), [updateParams]);
  const retry = useCallback(() => updateParams({ mockError: "" }), [updateParams]);

  // `discoverable: false` drops an app entirely rather than locking it -
  // the lever for tools a normal user should not even know exist.
  const applications = useMemo(() => {
    if (isLoading || hasError) return [];
    return HUB_APPLICATIONS.filter((app) => app.discoverable !== false);
  }, [isLoading, hasError]);

  const categories = useMemo<HubCategoryFilterOption[]>(
    () => [
      { id: "all", label: "All", count: applications.length },
      ...HUB_CATEGORIES.map((category) => ({
        id: category.id,
        label: category.label,
        count: applications.filter((app) => app.category === category.id).length,
      })),
    ],
    [applications],
  );

  const visibleApplications = useMemo(
    () =>
      applications.filter(
        (app) => (activeCategory === "all" || app.category === activeCategory) && matchesQuery(app, query),
      ),
    [applications, activeCategory, query],
  );

  const isFiltering = Boolean(query) || activeCategory !== "all";

  const lockedCount = useMemo(
    () => applications.filter((app) => app.access === "locked").length,
    [applications],
  );

  return {
    isLoading,
    hasError,
    categories,
    activeCategory,
    query: rawQuery,
    isFiltering,
    visibleApplications,
    lockedCount,
    hasCatalog: applications.length > 0,
    setQuery,
    setCategory,
    clearFilters,
    retry,
  };
}
