import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
} from "./hubGrid";

const MOBILE_SKELETON_COUNT = 15;

// Geometry mirrors AppCard exactly, so nothing shifts when the real tiles
// arrive.
const AppCardSkeleton = memo(() => (
  <>
    <div className="flex w-full min-w-0 flex-col items-center text-center">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl sm:h-[72px] sm:w-[72px] sm:rounded-2xl" />

      <div className="mt-1.5 flex w-full min-w-0 flex-col items-center">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="mt-1 h-2.5 w-12" />
      </div>
    </div>
  </>
));

AppCardSkeleton.displayName = "AppCardSkeleton";

export const AppCardSkeletonGrid = memo(
  ({ count = MOBILE_SKELETON_COUNT }: { count?: number }) => {
    const skeletons = Array.from({ length: count }, (_, index) => (
      <AppCardSkeleton key={index} />
    ));

    return (
      <>
        <div className="flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1">
          <div className={MOBILE_LAUNCHER_SCROLLER_CLASS}>
            <div className={MOBILE_LAUNCHER_PAGE_CLASS}>{skeletons}</div>
          </div>
        </div>
      </>
    );
  },
);

AppCardSkeletonGrid.displayName = "AppCardSkeletonGrid";

export default AppCardSkeleton;
