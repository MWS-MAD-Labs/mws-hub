import { memo } from "react";
import AppCard from "./AppCard";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
import {
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
} from "./hubGrid";
import type { HubApplication, HubUser } from "@/model/hub-model";
import BirthdayList from "@/mobile/components/layout/Birthdaylist";
import Announcements from "@/mobile/components/layout/Announcements";

type MobileAppLauncherProps = {
  apps: HubApplication[];
  query: string;
  user?: HubUser;
  onQueryChange: (value: string) => void;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

const MobileAppLauncher = memo(
  ({
    apps,
    query,
    user,
    onQueryChange,
    onRequestAccess,
    onReportProblem,
  }: MobileAppLauncherProps) => {
    return (
      <section
        className="
          relative
          flex
          h-full
          min-h-0
          flex-col
          overflow-hidden
          pt-1
          pb-[calc(env(safe-area-inset-bottom)+4.75rem)]
          sm:hidden
        "
      >
        <BirthdayList />

        <div className={MOBILE_LAUNCHER_SCROLLER_CLASS}>
          <div className="flex items-baseline gap-1.5 px-1 pt-1">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Your Apps
            </h2>
            <span className="text-[10px] font-medium text-muted-foreground/70">
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
            <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/50 text-sm font-medium text-muted-foreground">
              No apps found
            </div>
          )}

          <Announcements />
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
