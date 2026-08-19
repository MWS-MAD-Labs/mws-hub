import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HUB_GRID_CLASS } from "./hubGrid";

// Geometry mirrors AppCard exactly, so nothing shifts when the real tiles
// arrive.
const AppCardSkeleton = memo(() => (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/30 p-3.5">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 pt-0.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
    </div>
));

AppCardSkeleton.displayName = "AppCardSkeleton";

export const AppCardSkeletonGrid = memo(({ count = 12 }) => (
    <div className={HUB_GRID_CLASS}>
        {Array.from({ length: count }, (_, index) => (
            <AppCardSkeleton key={index} />
        ))}
    </div>
));

AppCardSkeletonGrid.displayName = "AppCardSkeletonGrid";

export default AppCardSkeleton;
