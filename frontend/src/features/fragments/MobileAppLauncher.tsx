import { memo } from "react";
import AppCard from "./AppCard";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
import CategoryFilter from "./CategoryFilter";
import HubEmptyState from "./HubEmptyState";
import useGptCodeAccess from "@/features/gpt-code/useGptCodeAccess";
import {
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
} from "./hubGrid";
import type {
  HubApplication,
  HubCategoryFilterOption,
  HubUser,
} from "@/model/hub-model";
import BirthdayList from "@/mobile/Features/birthday";
import Announcements from "@/mobile/components/layout/Announcements";

type MobileAppLauncherProps = {
  apps: HubApplication[];
  categories: HubCategoryFilterOption[];
  activeCategory: string;
  scopes: HubCategoryFilterOption[];
  activeScope: string;
  query: string;
  user?: HubUser;
  onQueryChange: (value: string) => void;
  onCategorySelect: (id: string) => void;
  onScopeSelect: (id: string) => void;
  onClearFilters: () => void;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

const MobileAppLauncher = memo(
  ({
    apps,
    categories,
    activeCategory,
    scopes,
    activeScope,
    query,
    user,
    onQueryChange,
    onCategorySelect,
    onScopeSelect,
    onClearFilters,
    onRequestAccess,
    onReportProblem,
  }: MobileAppLauncherProps) => {
    // GPT Code has no tile in the grid: the bottom bar carries its button.
    const hasGptCode = useGptCodeAccess();

    return (
      <section className="relative flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1 sm:h-auto sm:gap-8 sm:overflow-visible sm:pb-0 sm:pt-0">
        <BirthdayList />

        <div className={`${MOBILE_LAUNCHER_SCROLLER_CLASS} py-10 sm:contents`}>
          {/* Category and scope filters: tablet and desktop only. */}
          <div className="mb-4 hidden space-y-1.5 px-1 sm:mb-0 sm:block sm:px-0">
            <CategoryFilter
              categories={categories}
              activeCategory={activeCategory}
              onSelect={onCategorySelect}
            />
            {scopes.length > 0 && (
              <CategoryFilter
                categories={scopes}
                activeCategory={activeScope}
                onSelect={onScopeSelect}
                label="Application scopes"
              />
            )}
          </div>

          {/* Heading and grid stay one block, so the 32px section gap
              does not open up between them. */}
          <div>
            <div className="flex items-baseline gap-1.5 px-1 pt-1 sm:px-0 sm:pt-0">
              <h2 className="text-xs font-semibold text-muted-foreground sm:text-base">
                Your Apps
              </h2>
              <span className="text-[10px] font-medium text-muted-foreground/70 sm:text-sm">
                {apps.length}
              </span>
            </div>

            {apps.length > 0 ? (
              <div className={MOBILE_LAUNCHER_PAGE_CLASS}>
                {apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    onRequestAccess={onRequestAccess}
                    onReportProblem={onReportProblem}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/50 text-sm font-medium text-muted-foreground sm:hidden">
                  No apps found
                </div>
                <div className="mb-2 mt-3 hidden sm:mb-0 sm:mt-4 sm:block">
                  <HubEmptyState
                    variant="no-results"
                    query={query}
                    onAction={onClearFilters}
                  />
                </div>
              </>
            )}
          </div>

          <Announcements />
        </div>

        <MobileSpotlightSearch
          query={query}
          user={user}
          onQueryChange={onQueryChange}
          showGptCode={hasGptCode}
        />
      </section>
    );
  },
);

MobileAppLauncher.displayName = "MobileAppLauncher";

export default MobileAppLauncher;
