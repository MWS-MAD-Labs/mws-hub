import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { hubApi } from "@/features/hub/api/hubApi";
import useHubTaxonomy from "@/hooks/useHubTaxonomy";
import type { HubApplication, HubCategoryFilterOption } from "@/model/hub-model";

// The pseudo-category the filter row opens on. Kept out of HUB_CATEGORIES
// because it is a view concern, not a bucket an app can belong to.
const ALL_CATEGORY = "all";

const normalize = (value = ""): string => String(value || "").toLowerCase().trim();

// Keywords are how one app stays findable from several angles without
// belonging to two categories at once - "drive", "batch" and "pdf" all reach
// Slides to PDF, but it still lives in exactly one bucket in the rail.
const matchesQuery = (app: HubApplication, query: string, labels: Map<string, string>): boolean => {
  if (!query) return true;
  const haystack = [app.name, app.description, labels.get(app.category), labels.get(app.scope || ""), ...(app.keywords || [])]
    .map(normalize)
    .join(" ");
  return haystack.includes(query);
};

export type UseHubCatalogResult = {
  isLoading: boolean;
  hasError: boolean;
  query: string;
  isFiltering: boolean;
  visibleApplications: HubApplication[];
  availableApplications: HubApplication[];
  hasCatalog: boolean;
  categories: HubCategoryFilterOption[];
  activeCategory: string;
  scopes: HubCategoryFilterOption[];
  activeScope: string;
  setScope: (id: string) => void;
  setQuery: (value: string) => void;
  setCategory: (id: string) => void;
  clearFilters: () => void;
  retry: () => void;
};

// Search lives in the URL so a filtered hub can be shared and survives a
// refresh - the same reason the dashboards here do it.
export default function useHubCatalog(): UseHubCatalogResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<HubApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const taxonomy = useHubTaxonomy();
  const labels = useMemo(
    () => new Map([...taxonomy.categories, ...taxonomy.scopes].map((item) => [item.key, item.name])),
    [taxonomy],
  );

  // The catalog arrives with server-side access state. Locked discoverable
  // apps stay in the list so users can request access from the card.
  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadFailed(false);

    hubApi
      .listApplications()
      .then((apps) => {
        if (!cancelled) setApplications(apps);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  // ?mockError=1 still forces the failure branch. A real fetch can fail on
  // its own now, but keeping the override means the error state stays
  // reviewable without having to break the backend to see it.
  const hasError = loadFailed || searchParams.get("mockError") === "1";

  const query = normalize(searchParams.get("q") || "");
  const rawQuery = searchParams.get("q") || "";
  const activeCategory = searchParams.get("cat") || ALL_CATEGORY;
  const activeScope = searchParams.get("scope") || ALL_CATEGORY;

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
  const setCategory = useCallback((id: string) => updateParams({ cat: id }), [updateParams]);
  const setScope = useCallback((id: string) => updateParams({ scope: id }), [updateParams]);
  const clearFilters = useCallback(() => updateParams({ q: "", cat: "", scope: "" }), [updateParams]);

  const retry = useCallback(() => {
    updateParams({ mockError: "" });
    setReloadCount((count) => count + 1);
  }, [updateParams]);

  // `discoverable: false` drops an app entirely rather than locking it -
  // the lever for tools a normal user should not even know exist. The
  // backend already applies it, this keeps the guarantee if a stale
  // response ever slips through.
  const searchable = useMemo(() => {
    if (isLoading || hasError) return [];
    return applications
      .filter((app) => app.discoverable !== false)
      .filter((app) => matchesQuery(app, query, labels));
  }, [applications, isLoading, hasError, query, labels]);

  const availableApplications = useMemo(
    () => applications.filter((app) => app.discoverable !== false),
    [applications],
  );

  // Counts follow the search but ignore the selected category, so the row
  // keeps saying how much is behind each tab. Counting after the category
  // filter would zero out every tab except the open one, which turns the
  // counts into noise and hides where the rest of the results went.
  // Each row's counts follow the search and the other row, but not its own selection.
  const inScope = useMemo(
    () => (activeScope === ALL_CATEGORY ? searchable : searchable.filter((app) => app.scope === activeScope)),
    [searchable, activeScope],
  );
  const inCategory = useMemo(
    () => (activeCategory === ALL_CATEGORY ? searchable : searchable.filter((app) => app.category === activeCategory)),
    [searchable, activeCategory],
  );

  const categories = useMemo(() => {
    const tally = new Map<string, number>();
    inScope.forEach((app) => tally.set(app.category, (tally.get(app.category) || 0) + 1));

    return [
      { id: ALL_CATEGORY, label: "All", count: inScope.length },
      ...taxonomy.categories.map((category) => ({
        id: category.key,
        label: category.name,
        count: tally.get(category.key) || 0,
      })),
      // An empty bucket still shows, greyed by its own zero. Tabs that come
      // and go as you type make the row jump around and cost more than the
      // space they save.
    ];
  }, [inScope, taxonomy.categories]);

  // Only offered once at least one application has a scope, so the row does not sit there empty.
  const scopes = useMemo(() => {
    if (!applications.some((app) => app.scope)) return [];
    const tally = new Map<string, number>();
    inCategory.forEach((app) => app.scope && tally.set(app.scope, (tally.get(app.scope) || 0) + 1));
    return [
      { id: ALL_CATEGORY, label: "All scopes", count: inCategory.length },
      ...taxonomy.scopes.map((scope) => ({ id: scope.key, label: scope.name, count: tally.get(scope.key) || 0 })),
    ];
  }, [applications, inCategory, taxonomy.scopes]);

  const visibleApplications = useMemo(
    () => (activeScope === ALL_CATEGORY ? inCategory : inCategory.filter((app) => app.scope === activeScope)),
    [inCategory, activeScope],
  );

  const hasCatalog = !isLoading && !hasError && applications.length > 0;
  const isFiltering = Boolean(query) || activeCategory !== ALL_CATEGORY || activeScope !== ALL_CATEGORY;

  return {
    isLoading,
    hasError,
    query: rawQuery,
    isFiltering,
    visibleApplications,
    availableApplications,
    hasCatalog,
    categories,
    activeCategory,
    scopes,
    activeScope,
    setScope,
    setQuery,
    setCategory,
    clearFilters,
    retry,
  };
}
