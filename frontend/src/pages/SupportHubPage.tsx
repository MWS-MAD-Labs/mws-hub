import { memo, useCallback } from "react";
import { toast } from "sonner";
import HubHeader from "@/features/fragments/HubHeader";
import HubIntro from "@/features/fragments/HubIntro";
import HubSearch from "@/features/fragments/HubSearch";
import AppCard from "@/features/fragments/AppCard";
import MobileAppLauncher from "@/features/fragments/MobileAppLauncher";
import HubEmptyState from "@/features/fragments/HubEmptyState";
import { AppCardSkeletonGrid } from "@/features/fragments/AppCardSkeleton";
import { HUB_GRID_CLASS } from "@/features/fragments/hubGrid";
import useHubCatalog from "@/hooks/useHubCatalog";
import type { HubApplication } from "@/model/hub-model";
import { toHubUser } from "@/model/auth-model";
import { useAuth } from "@/features/auth/hooks/useAuth";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "admin@millennia21.id";

const SupportHubPage = memo(() => {
  const { user } = useAuth();
  const {
    isLoading,
    hasError,
    query,
    isFiltering,
    visibleApplications,
    hasCatalog,
    setQuery,
    clearFilters,
    retry,
  } = useHubCatalog();

  // Placeholder until the access-request flow exists - the affordance must
  // do something visible now so the locked state can actually be reviewed.
  const handleRequestAccess = useCallback((app: HubApplication) => {
    toast("Access request noted", {
      description: `Requesting access to ${app.name}. This is a mock action, no request has been sent yet.`,
    });
  }, []);

  const isSettled = !isLoading && !hasError;
  const showNoResults = isSettled && hasCatalog && visibleApplications.length === 0;
  const showEmptyCatalog = isSettled && !hasCatalog;

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground sm:h-auto sm:min-h-screen sm:overflow-visible">
      <HubHeader user={user ? toHubUser(user) : undefined} />

      <main className="mx-auto flex h-[calc(100svh-3.5rem)] max-w-[1600px] flex-col overflow-hidden px-4 pb-0 pt-4 sm:block sm:h-auto sm:overflow-visible sm:px-6 sm:py-9">
        <div className="hidden sm:block">
          <HubIntro />
        </div>

        {/* Capped rather than stretched to the full 1600px: a search
            field wider than its own results is harder to aim at. */}
        <div className="mt-5 hidden max-w-xl sm:block">
          <HubSearch query={query} onQueryChange={setQuery} />
        </div>

        <section className="min-h-0 flex-1 sm:mt-6 sm:block sm:h-auto">
          <div className="mb-3 hidden items-baseline gap-2 sm:flex">
            <h2 className="text-sm font-medium text-foreground">
              {isFiltering ? "Results" : "All applications"}
            </h2>
            {isSettled && (
              <p className="text-xs text-muted-foreground">{visibleApplications.length}</p>
            )}
          </div>

          {isLoading && <AppCardSkeletonGrid />}

          {hasError && <HubEmptyState variant="error" onAction={retry} />}

          {showEmptyCatalog && (
            <div className="pt-20 sm:pt-0">
              <HubEmptyState variant="no-apps" supportEmail={SUPPORT_EMAIL} />
            </div>
          )}

          {showNoResults && (
            <div className="hidden sm:block">
              <HubEmptyState variant="no-results" query={query} onAction={clearFilters} />
            </div>
          )}

          {isSettled && hasCatalog && (
            <>
              <MobileAppLauncher
                apps={visibleApplications}
                query={query}
                onQueryChange={setQuery}
                onRequestAccess={handleRequestAccess}
              />

              <div className={HUB_GRID_CLASS}>
                {visibleApplications.map((app) => (
                  <AppCard key={app.id} app={app} onRequestAccess={handleRequestAccess} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
});

SupportHubPage.displayName = "SupportHubPage";
export default SupportHubPage;
