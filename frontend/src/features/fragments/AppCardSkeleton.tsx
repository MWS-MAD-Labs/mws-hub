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
  <>
    <div className="flex w-full min-w-0 flex-col items-center text-center sm:hidden">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />

      <div className="mt-1.5 flex w-full min-w-0 flex-col items-center">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="mt-1 h-2.5 w-12" />
      </div>
    </div>

    <div className="hidden min-h-[88px] min-w-0 items-center gap-3.5 rounded-md border border-border/70 bg-card p-4 pr-3 sm:flex">
      <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
    </div>
  </>
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
