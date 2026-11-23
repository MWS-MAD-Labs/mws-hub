import { memo, useRef, useState, type RefObject } from "react";
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

// Keep the launcher at nine cells: eight apps plus All apps in the last cell.
const MOBILE_FRONT_APP_LIMIT = 8;

const AllAppsTile = ({
  onClick,
  buttonRef,
}: {
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement>;
}) => (
  <button
    ref={buttonRef}
    type="button"
    onClick={onClick}
    aria-haspopup="dialog"
    className="group flex w-full min-w-0 max-w-[6.75rem] flex-col items-center justify-start rounded-xl text-center transition-transform duration-150 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-none"
  >
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card text-foreground ring-1 ring-border/55 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors group-hover:bg-muted sm:h-[60px] sm:w-[60px] sm:rounded-2xl">
      <LayoutGrid
        className="h-5 w-5 sm:h-7 sm:w-7"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </span>
    <span className="mt-1 text-[11px] font-semibold leading-[14px] text-foreground sm:mt-2 sm:text-[13px] sm:leading-[18px]">
      All apps
    </span>
  </button>
);

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
    const allAppsTileRef = useRef<HTMLButtonElement>(null);

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
                <AllAppsTile
                  buttonRef={allAppsTileRef}
                  onClick={() => setIsAllAppsOpen(true)}
                />
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
          returnFocusRef={allAppsTileRef}
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
