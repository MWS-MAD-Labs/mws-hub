export const MOBILE_PAGE_SIZE = 15;

export const MOBILE_LAUNCHER_SCROLLER_CLASS =
  "-mx-4 min-h-0 flex-1 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const MOBILE_LAUNCHER_PAGE_CLASS =
  "grid h-full w-full shrink-0 snap-start grid-cols-3 grid-rows-5 justify-items-center gap-x-4 gap-y-2";

// From sm upward the tiles keep their wider catalog shape.
export const HUB_GRID_CLASS =
  "hidden sm:grid sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
