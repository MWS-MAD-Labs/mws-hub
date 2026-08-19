import { memo, useEffect, useMemo, useRef, useState } from "react";
import AppCard from "./AppCard";
import MobileSpotlightSearch from "./MobileSpotlightSearch";
import {
  MOBILE_LAUNCHER_PAGE_CLASS,
  MOBILE_LAUNCHER_SCROLLER_CLASS,
  MOBILE_PAGE_SIZE,
} from "./hubGrid";
import type { HubApplication } from "@/model/hub-model";

type MobileAppLauncherProps = {
  apps: HubApplication[];
  query: string;
  onQueryChange: (value: string) => void;
  onRequestAccess?: (app: HubApplication) => void;
};

const chunkApplications = (apps: HubApplication[]): HubApplication[][] => {
  const pages: HubApplication[][] = [];
  for (let index = 0; index < apps.length; index += MOBILE_PAGE_SIZE) {
    pages.push(apps.slice(index, index + MOBILE_PAGE_SIZE));
  }
  return pages;
};

const MobileAppLauncher = memo(({ apps, query, onQueryChange, onRequestAccess }: MobileAppLauncherProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activePage, setActivePage] = useState(0);
  const pages = useMemo(() => chunkApplications(apps), [apps]);
  const pageCount = pages.length;

  useEffect(() => {
    setActivePage(0);
    scrollerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [query, pageCount]);

  const updateActivePage = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const nextPage = pageRefs.current.reduce(
      (closest, page, index) => {
        if (!page) return closest;
        const distance = Math.abs(page.offsetLeft - scroller.scrollLeft - 16);
        return distance < closest.distance ? { index, distance } : closest;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    ).index;
    setActivePage(Math.min(Math.max(nextPage, 0), Math.max(pageCount - 1, 0)));
  };

  const goToPage = (pageIndex: number) => {
    pageRefs.current[pageIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
    setActivePage(pageIndex);
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1 sm:hidden">
      <div
        ref={scrollerRef}
        onScroll={updateActivePage}
        className={`${MOBILE_LAUNCHER_SCROLLER_CLASS} touch-pan-x snap-x snap-mandatory`}
      >
        {pageCount > 0 ? (
          <div className="flex h-full gap-0">
            {pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                ref={(element) => {
                  pageRefs.current[pageIndex] = element;
                }}
                className={MOBILE_LAUNCHER_PAGE_CLASS}
              >
                {page.map((app) => (
                  <AppCard key={app.id} app={app} onRequestAccess={onRequestAccess} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
            No apps found
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="pointer-events-auto flex h-7 shrink-0 items-center justify-center gap-1.5">
          {pages.map((_, pageIndex) => (
            <button
              key={pageIndex}
              type="button"
              aria-label={`Go to page ${pageIndex + 1}`}
              onClick={() => goToPage(pageIndex)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activePage === pageIndex ? "w-5 bg-foreground/75" : "w-1.5 bg-foreground/25"
              }`}
            />
          ))}
        </div>
      )}

      <MobileSpotlightSearch query={query} onQueryChange={onQueryChange} />
    </section>
  );
});

MobileAppLauncher.displayName = "MobileAppLauncher";
export default MobileAppLauncher;
