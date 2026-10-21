import { memo, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppCard from "./AppCard";
import CategoryFilter from "./CategoryFilter";
import HubEmptyState from "./HubEmptyState";
import HubIntro from "./HubIntro";
import HubSearch from "./HubSearch";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
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
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "mws-hub.desktop-sidebar";

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
      try {
        return window.sessionStorage.getItem(SIDEBAR_STORAGE_KEY) !== "closed";
      } catch {
        return true;
      }
    });

    useEffect(() => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return;

      try {
        window.sessionStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          isSidebarOpen ? "open" : "closed",
        );
      } catch {
        // The toggle still works in memory when browser storage is disabled.
      }
    }, [isSidebarOpen]);

    return (
      <section
        className={cn(
          "relative flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1",
          "sm:grid sm:h-auto sm:min-h-[calc(100vh-4rem)] sm:grid-cols-1 sm:overflow-visible sm:pb-0 sm:pt-0",
          "lg:items-stretch lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out",
          isSidebarOpen
            ? "lg:grid-cols-[minmax(0,1fr)_20rem]"
            : "lg:grid-cols-[minmax(0,1fr)_0rem]",
        )}
      >
        <aside
          className={cn(
            "contents sm:relative sm:order-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:border-t sm:border-border/70 sm:p-8",
            "lg:block lg:min-w-0 lg:border-l lg:border-t-0 lg:bg-muted/20 lg:p-0",
            isSidebarOpen ? "lg:border-border/70" : "lg:border-transparent",
          )}
          aria-label="Hub updates"
        >
          <button
            type="button"
            onClick={() => setIsSidebarOpen((open) => !open)}
            aria-controls="desktop-hub-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label={
              isSidebarOpen ? "Close updates sidebar" : "Open updates sidebar"
            }
            className={cn(
              "absolute top-1/2 z-10 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex",
              "left-0",
            )}
          >
            {isSidebarOpen ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <div
            id="desktop-hub-sidebar"
            className={cn(
              "contents lg:block lg:h-full lg:overflow-hidden lg:px-3 lg:py-3 lg:transition-opacity lg:duration-200",
              isSidebarOpen
                ? "lg:pointer-events-auto lg:opacity-100"
                : "lg:pointer-events-none lg:opacity-0",
            )}
          >
            <div className="contents lg:flex lg:w-full lg:flex-col lg:gap-3">
              <BirthdayList />
              <Announcements className="hidden sm:block sm:mb-0" />
            </div>
          </div>
        </aside>

        <div
          className={`${MOBILE_LAUNCHER_SCROLLER_CLASS} sm:order-1 sm:overflow-visible py-10 sm:px-6 sm:py-8 lg:px-8 lg:py-10 xl:pr-10 xl:pl-[max(2.5rem,calc((100vw-100rem)/2+2.5rem))]`}
        >
          <div className="flex items-baseline gap-1.5 px-1 pt-1 sm:hidden">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Your Apps
            </h2>
            <span className="text-[10px] font-medium text-muted-foreground/70">
              {apps.length}
            </span>
          </div>

          <div className="hidden sm:block">
            {user && <HubIntro user={user} />}

            <div className="mt-5 max-w-2xl">
              <HubSearch query={query} onQueryChange={onQueryChange} />
            </div>

            <div className="mt-3 space-y-1.5">
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

            <div className="mt-8">
              <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                Apps
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {apps.length} applications available to your account
              </p>
            </div>
          </div>

          {apps.length > 0 ? (
            <div
              className={`${MOBILE_LAUNCHER_PAGE_CLASS} sm:mt-4 sm:grid-cols-2 sm:justify-items-stretch sm:gap-4 sm:px-0 sm:pb-0 sm:pt-0 xl:grid-cols-3 2xl:grid-cols-4`}
            >
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
              <div className="hidden sm:mt-4 sm:block">
                <HubEmptyState
                  variant="no-results"
                  query={query}
                  onAction={onClearFilters}
                />
              </div>
            </>
          )}

          <Announcements className="sm:hidden" />
        </div>

        <MobileSpotlightSearch
          query={query}
          user={user}
          onQueryChange={onQueryChange}
        />
      </section>
    );
  },
);

MobileAppLauncher.displayName = "MobileAppLauncher";

export default MobileAppLauncher;
