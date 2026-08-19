import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HUB_GRID_CLASS,
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
  MOBILE_PAGE_SIZE,
} from "./hubGrid";

// Geometry mirrors AppCard exactly, so nothing shifts when the real tiles
// arrive.
const AppCardSkeleton = memo(() => (
  <div className="flex h-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg p-0 sm:h-auto sm:flex-row sm:items-start sm:justify-start sm:gap-3 sm:overflow-visible sm:rounded-xl sm:border sm:border-border/50 sm:bg-card/30 sm:p-3.5">
    <Skeleton className="h-[clamp(2.5rem,7.2svh,4rem)] w-[clamp(2.5rem,7.2svh,4rem)] shrink-0 rounded-[16px] sm:h-10 sm:w-10 sm:rounded-lg" />
    <div className="flex min-w-0 flex-col items-center pt-0 sm:flex-1 sm:items-start sm:pt-0.5">
      <Skeleton className="h-2.5 w-12 sm:h-3.5 sm:w-2/5" />
      <Skeleton className="mt-1 h-2.5 w-10 sm:mt-2 sm:h-3 sm:w-4/5" />
    </div>
  </div>
));

AppCardSkeleton.displayName = "AppCardSkeleton";

export const AppCardSkeletonGrid = memo(({ count = MOBILE_PAGE_SIZE }: { count?: number }) => {
  const skeletons = Array.from({ length: count }, (_, index) => <AppCardSkeleton key={index} />);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1 sm:hidden">
        <div className={`${MOBILE_LAUNCHER_SCROLLER_CLASS} snap-x snap-mandatory`}>
          <div className="flex h-full">
            <div className={MOBILE_LAUNCHER_PAGE_CLASS}>{skeletons.slice(0, MOBILE_PAGE_SIZE)}</div>
          </div>
        </div>
      </div>

      <div className={HUB_GRID_CLASS}>{skeletons}</div>
    </>
  );
});

AppCardSkeletonGrid.displayName = "AppCardSkeletonGrid";

export default AppCardSkeleton;
