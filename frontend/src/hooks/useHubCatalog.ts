import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { hubApi } from "@/features/hub/api/hubApi";
import { getCategoryLabel } from "@/data/hubCategories";
import type { HubApplication } from "@/model/hub-model";

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
  query: string;
  isFiltering: boolean;
  visibleApplications: HubApplication[];
  hasCatalog: boolean;
  setQuery: (value: string) => void;
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

  // The catalog arrives already filtered to this person - GET /apps only
  // returns what they may open, so there is no access check left to do here.
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
  const clearFilters = useCallback(() => updateParams({ q: "", cat: "" }), [updateParams]);

  const retry = useCallback(() => {
    updateParams({ mockError: "" });
    setReloadCount((count) => count + 1);
  }, [updateParams]);

  // `discoverable: false` drops an app entirely rather than locking it -
  // the lever for tools a normal user should not even know exist. The
  // backend already applies it, this keeps the guarantee if a stale
  // response ever slips through.
  const visibleApplications = useMemo(() => {
    if (isLoading || hasError) return [];
    return applications
      .filter((app) => app.discoverable !== false)
      .filter((app) => matchesQuery(app, query));
  }, [applications, isLoading, hasError, query]);

  const hasCatalog = !isLoading && !hasError && applications.length > 0;
  const isFiltering = Boolean(query);

  return {
    isLoading,
    hasError,
    query: rawQuery,
    isFiltering,
    visibleApplications,
    hasCatalog,
    setQuery,
    clearFilters,
    retry,
  };
}
