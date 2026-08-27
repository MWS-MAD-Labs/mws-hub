import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HUB_GRID_CLASS,
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
} from "./hubGrid";

const MOBILE_SKELETON_COUNT = 15;

// Geometry mirrors AppCard exactly, so nothing shifts when the real tiles
// arrive.
const AppCardSkeleton = memo(() => (
  <div
    className="
      flex
      w-full
      min-w-0
      flex-col
      items-center
      text-center

      sm:h-auto
      sm:flex-row
      sm:items-start
      sm:justify-start
      sm:gap-3
      sm:overflow-visible
      sm:rounded-xl
      sm:border
      sm:border-border/50
      sm:bg-card/30
      sm:p-3.5
      sm:text-left
    "
  >
    <Skeleton
      className="
        h-12
        w-12
        shrink-0
        rounded-xl

        sm:h-10
        sm:w-10
        sm:rounded-lg
      "
    />

    <div
      className="
        mt-1.5
        flex
        w-full
        min-w-0
        flex-col
        items-center

        sm:mt-0
        sm:items-start
        sm:flex-1
        sm:pt-0.5
      "
    >
      <Skeleton className="h-2.5 w-16" />

      <Skeleton
        className="
          mt-1
          h-2.5
          w-12

          sm:mt-2
          sm:h-3
          sm:w-4/5
        "
      />
    </div>
  </div>
));

AppCardSkeleton.displayName = "AppCardSkeleton";

export const AppCardSkeletonGrid = memo(({ count = MOBILE_SKELETON_COUNT }: { count?: number }) => {
  const skeletons = Array.from({ length: count }, (_, index) => <AppCardSkeleton key={index} />);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1 sm:hidden">
        <div className={MOBILE_LAUNCHER_SCROLLER_CLASS}>
          <div className={MOBILE_LAUNCHER_PAGE_CLASS}>{skeletons}</div>
        </div>
      </div>

      <div className={HUB_GRID_CLASS}>{skeletons}</div>
    </>
  );
});

AppCardSkeletonGrid.displayName = "AppCardSkeletonGrid";

export default AppCardSkeleton;
