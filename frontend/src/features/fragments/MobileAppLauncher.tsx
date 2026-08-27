import { memo } from "react";
import AppCard from "./AppCard";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
import {
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
} from "./hubGrid";
import type { HubApplication, HubUser } from "@/model/hub-model";

type MobileAppLauncherProps = {
  apps: HubApplication[];
  query: string;
  user?: HubUser;
  onQueryChange: (value: string) => void;
  onRequestAccess?: (app: HubApplication) => void;
};

const MobileAppLauncher = memo(
  ({
    apps,
    query,
    user,
    onQueryChange,
    onRequestAccess,
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
        <div className={MOBILE_LAUNCHER_SCROLLER_CLASS}>
          {apps.length > 0 ? (
            <div className={MOBILE_LAUNCHER_PAGE_CLASS}>
              {apps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  onRequestAccess={onRequestAccess}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
              No apps found
            </div>
          )}
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
