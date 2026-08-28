import { memo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import HubHeader from "@/features/fragments/HubHeader";
import HubIntro from "@/features/fragments/HubIntro";
import HubSearch from "@/features/fragments/HubSearch";
import CategoryFilter from "@/features/fragments/CategoryFilter";
import AppCard from "@/features/fragments/AppCard";
import MobileAppLauncher from "@/features/fragments/MobileAppLauncher";
import HubEmptyState from "@/features/fragments/HubEmptyState";
import { AppCardSkeletonGrid } from "@/features/fragments/AppCardSkeleton";
import { HUB_GRID_CLASS } from "@/features/fragments/hubGrid";
import useHubCatalog from "@/hooks/useHubCatalog";
import type { HubApplication } from "@/model/hub-model";
import { toHubUser } from "@/model/auth-model";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { isMadLabsUser } from "@/lib/admin-access";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "admin@millennia21.id";

// Why a launch bounced back here instead of opening the app. The backend's
// /apps/:appId/launch redirects with one of these codes rather than showing
// a raw error body in the tab it just opened.
// Why a launch bounced back here instead of opening the app. The backend's
// /apps/:appId/launch redirects with one of these codes rather than showing
// a raw error body in the tab it just opened, and passes the app name so the
// notice can say which one.
const LAUNCH_ERRORS: Record<string, (app: string) => { title: string; description: string }> = {
  app_access_denied: (app) => ({
    title: `You don't have access to ${app}`,
    description: "Your MWS account isn't admitted to this application yet. Ask MAD Labs if you need it.",
  }),
  app_maintenance: (app) => ({
    title: `${app} is under maintenance`,
    description: "It's temporarily switched off while MAD Labs works on it. Try again later.",
  }),
  app_coming_soon: (app) => ({
    title: `${app} isn't released yet`,
    description: "It's listed here early. You'll be able to open it once it goes live.",
  }),
  app_no_link: (app) => ({
    title: `${app} has no link yet`,
    description: `It's in the catalog but no URL has been registered for it. Let MAD Labs know at ${SUPPORT_EMAIL}.`,
  }),
  account_inactive: () => ({
    title: "Your account is no longer active",
    description: `Your record in the Central database is inactive, so apps can't be opened. Contact ${SUPPORT_EMAIL} to restore it.`,
  }),
  central_unavailable: () => ({
    title: "Couldn't check your access",
    description: "The Central database didn't answer just now. Try opening the app again in a moment.",
  }),
};
const SupportHubPage = memo(() => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    isLoading,
    hasError,
    query,
    isFiltering,
    visibleApplications,
    hasCatalog,
    categories,
    activeCategory,
    setQuery,
    setCategory,
    clearFilters,
    retry,
  } = useHubCatalog();

  // A refused launch lands back here with ?error=<code>. Surface it once,
  // then strip the param so a refresh doesn't replay the same toast.
  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;

    const build = LAUNCH_ERRORS[code];
    if (build) {
      // "That app" reads better than an empty gap when the name is missing,
      // which happens for failures that are not about a specific app.
      const failure = build(searchParams.get("app") || "That app");
      toast.error(failure.title, { description: failure.description });
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("error");
        next.delete("app");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

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
  const isAdmin = isMadLabsUser(user);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground sm:h-auto sm:min-h-screen sm:overflow-visible">
      <HubHeader user={user ? toHubUser(user) : undefined} isAdmin={isAdmin} />

      <main className="mx-auto flex h-[calc(100svh-3.5rem)] max-w-[1600px] flex-col overflow-hidden px-4 pb-0 pt-4 sm:block sm:h-auto sm:overflow-visible sm:px-6 sm:py-9">
        <div className="hidden sm:block">
          <HubIntro />
        </div>

        {/* Capped rather than stretched to the full 1600px: a search
            field wider than its own results is harder to aim at. */}
        <div className="mt-5 hidden max-w-xl sm:block">
          <HubSearch query={query} onQueryChange={setQuery} />
        </div>

        {/* Sits between search and results because that is the order the
            filtering happens in - type first, then narrow. Desktop only, the
            same as HubSearch: mobile has its own spotlight search. */}
        {isSettled && hasCatalog && (
          <div className="mt-4 hidden sm:block">
            <CategoryFilter
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setCategory}
            />
          </div>
        )}

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
                user={user ? toHubUser(user) : undefined}
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
