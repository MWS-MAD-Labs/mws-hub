import { memo, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileSpotlightSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

const MobileSpotlightSearch = memo(({ query, onQueryChange }: MobileSpotlightSearchProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(focusTimer);
  }, [isExpanded]);

  const collapse = () => {
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  const clear = () => {
    onQueryChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex justify-center px-4 sm:hidden">
      {isExpanded && (
        <button
          type="button"
          aria-label="Close search"
          onClick={collapse}
          className="pointer-events-auto fixed inset-0 z-0 bg-background/20 backdrop-blur-[3px]"
        />
      )}

      <div
        className={cn(
          "pointer-events-auto relative z-10 flex h-12 items-center overflow-hidden rounded-full border border-white/40 bg-card/60 shadow-[0_16px_40px_rgba(15,23,42,0.2)] backdrop-blur-2xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-card/50",
          isExpanded ? "w-full max-w-[calc(100vw-2rem)] px-3" : "w-14 px-0",
        )}
      >
        <button
          type="button"
          aria-label="Search applications"
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex h-12 w-14 shrink-0 items-center justify-center rounded-full text-foreground transition-all duration-300",
            isExpanded && "w-9 justify-start",
          )}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") collapse();
          }}
          placeholder="Search"
          aria-label="Search applications"
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground transition-opacity duration-200",
            isExpanded ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />

        {isExpanded && query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
});

MobileSpotlightSearch.displayName = "MobileSpotlightSearch";
export default MobileSpotlightSearch;
