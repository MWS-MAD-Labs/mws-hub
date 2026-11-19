import { memo, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import MobileAllAppsSheet from "./MobileAllAppsSheet";
import AppCard from "./AppCard";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
import HubEmptyState from "./HubEmptyState";
import useGptCodeAccess from "@/features/gpt-code/useGptCodeAccess";
import { cn } from "@/lib/utils";
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

// How many app tiles the front grid shows: three full rows of three. The
// rest are behind See All in the card header.
const MOBILE_FRONT_APP_LIMIT = 9;

type MobileAppLauncherProps = {
  apps: HubApplication[];
  scopes: HubCategoryFilterOption[];
  query: string;
  user?: HubUser;
  onQueryChange: (value: string) => void;
  onClearFilters: () => void;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

const MobileAppLauncher = memo(
  ({
    apps,
    scopes,
    query,
    user,
    onQueryChange,
    onClearFilters,
    onRequestAccess,
    onReportProblem,
  }: MobileAppLauncherProps) => {
    // GPT Code has no tile in the grid: the bottom bar carries its button.
    const hasGptCode = useGptCodeAccess();
    const [isAllAppsOpen, setIsAllAppsOpen] = useState(false);
    const seeAllButtonRef = useRef<HTMLButtonElement>(null);

    return (
      <section className="relative flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1 sm:h-auto sm:gap-6 sm:overflow-visible sm:pb-0 sm:pt-0">
        <div className={`${MOBILE_LAUNCHER_SCROLLER_CLASS} pb-10 pt-1 sm:contents`}>
          <BirthdayList />

          <section
            className={cn(
              "mx-1 mb-3 shrink-0 rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-sm",
              "sm:mx-0 sm:mb-0 sm:rounded-xl sm:p-4",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-primary sm:h-8 sm:w-8 sm:rounded-lg">
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 sm:ml-1">
                <h2 className="text-sm font-semibold leading-tight text-card-foreground sm:text-[15px]">
                  Your Apps
                </h2>
                <p className="text-[11px] leading-tight text-muted-foreground sm:mt-0.5 sm:text-xs">
                  {apps.length} {apps.length === 1 ? "app" : "apps"} you can open
                </p>
              </div>

              <button
                ref={seeAllButtonRef}
                type="button"
                onClick={() => setIsAllAppsOpen(true)}
                aria-haspopup="dialog"
                className="ml-auto shrink-0 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 sm:py-1.5 sm:text-xs"
              >
                See All
              </button>
            </div>

            {apps.length > 0 ? (
              <div className={cn(MOBILE_LAUNCHER_PAGE_CLASS, "px-0 pb-1 sm:pb-0")}>
                {apps.slice(0, MOBILE_FRONT_APP_LIMIT).map((app) => (
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
                <div className="mt-2.5 flex min-h-32 flex-col items-center justify-center gap-1 rounded-md bg-muted/40 text-sm font-medium text-muted-foreground sm:hidden">
                  No apps found
                  <button
                    type="button"
                    onClick={() => setIsAllAppsOpen(true)}
                    className="min-h-11 rounded-full px-4 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    View all apps
                  </button>
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
          </section>

          <Announcements />
        </div>

        <MobileAllAppsSheet
          open={isAllAppsOpen}
          onOpenChange={setIsAllAppsOpen}
          returnFocusRef={seeAllButtonRef}
          apps={apps}
          scopes={scopes}
          onClearFilters={onClearFilters}
          onRequestAccess={onRequestAccess}
          onReportProblem={onReportProblem}
        />

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
