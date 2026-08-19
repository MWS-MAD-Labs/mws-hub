import { memo, useCallback } from "react";
import HubHeader from "./components/HubHeader";
import HubIntro from "./components/HubIntro";
import HubSearch from "./components/HubSearch";
import CategoryFilter from "./components/CategoryFilter";
import AppCard from "./components/AppCard";
import HubEmptyState from "./components/HubEmptyState";
import { AppCardSkeletonGrid } from "./components/AppCardSkeleton";
import { HUB_GRID_CLASS } from "./components/hubGrid";
import useHubCatalog from "./hooks/useHubCatalog";
import { toast } from "@/components/ui/use-toast";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "admin@millennia21.id";

// TODO(fase-3): replace with the real session once the Hub has its own
// Google Workspace login + central-DB role lookup wired up.
const MOCK_USER = { name: "Preview User", email: "preview@millennia21.id", role: "teacher" };

const SupportHubPage = memo(() => {
    const user = MOCK_USER;
    const {
        isLoading,
        hasError,
        categories,
        activeCategory,
        query,
        isFiltering,
        visibleApplications,
        lockedCount,
        hasCatalog,
        setQuery,
        setCategory,
        clearFilters,
        retry,
    } = useHubCatalog(user);

    // Placeholder until the access-request flow exists - the affordance must
    // do something visible now so the locked state can actually be reviewed.
    const handleRequestAccess = useCallback((app) => {
        toast({
            title: "Access request noted",
            description: `Requesting access to ${app.name}. This is a mock action — no request has been sent yet.`,
        });
    }, []);

    const isSettled = !isLoading && !hasError;
    const showNoResults = isSettled && hasCatalog && visibleApplications.length === 0;
    const showEmptyCatalog = isSettled && !hasCatalog;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <HubHeader user={user} />

            <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9">
                <HubIntro />

                {/* Capped rather than stretched to the full 1600px: a search
                    field wider than its own results is harder to aim at. */}
                <div className="mt-5 max-w-xl">
                    <HubSearch query={query} onQueryChange={setQuery} />
                </div>

                <div className="mt-4 border-b border-border/40 pb-3">
                    <CategoryFilter
                        categories={categories}
                        activeCategory={activeCategory}
                        onSelect={setCategory}
                    />
                </div>

                <section className="mt-6">
                    <div className="mb-3 flex items-baseline gap-2">
                        <h2 className="text-sm font-medium text-foreground">
                            {isFiltering ? "Results" : "All applications"}
                        </h2>
                        {isSettled && (
                            <p className="text-xs text-muted-foreground">
                                {visibleApplications.length}
                                {!isFiltering && lockedCount > 0 && ` · ${lockedCount} locked`}
                            </p>
                        )}
                    </div>

                    {isLoading && <AppCardSkeletonGrid count={12} />}

                    {hasError && <HubEmptyState variant="error" onAction={retry} />}

                    {showEmptyCatalog && (
                        <HubEmptyState variant="no-apps" supportEmail={SUPPORT_EMAIL} />
                    )}

                    {showNoResults && (
                        <HubEmptyState variant="no-results" query={query} onAction={clearFilters} />
                    )}

                    {isSettled && visibleApplications.length > 0 && (
                        <div className={HUB_GRID_CLASS}>
                            {visibleApplications.map((app) => (
                                <AppCard key={app.id} app={app} onRequestAccess={handleRequestAccess} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
});

SupportHubPage.displayName = "SupportHubPage";
export default SupportHubPage;
