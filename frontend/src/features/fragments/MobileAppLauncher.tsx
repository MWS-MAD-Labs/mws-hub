import { memo, useRef, useState, type RefObject } from "react";
import { LayoutGrid } from "lucide-react";
import MobileAllAppsSheet from "./MobileAllAppsSheet";
import AppCard from "./AppCard";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
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

// How many app tiles the front grid shows before the All apps tile.
const MOBILE_FRONT_APP_LIMIT = 8;

// The ninth cell opens the full, scope-grouped app list.
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
      <LayoutGrid className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.8} aria-hidden="true" />
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

          {/* Heading and grid stay one block, so the section gap
              does not open up between them. */}
          <div>
            <div className="flex items-baseline gap-1.5 px-1 pt-1 sm:px-0 sm:pt-0">
              <h2 className="text-xs font-semibold text-muted-foreground sm:text-[15px]">
                Your Apps
              </h2>
              <span className="text-[10px] font-medium text-muted-foreground/70 sm:text-[13px]">
                {apps.length}
              </span>
            </div>

            {apps.length > 0 ? (
              <>
                <div className={MOBILE_LAUNCHER_PAGE_CLASS}>
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
              </>
            ) : (
              <>
                <div className="flex min-h-36 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 bg-card/50 text-sm font-medium text-muted-foreground sm:hidden">
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
          </div>

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
