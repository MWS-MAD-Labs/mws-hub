import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import type { HubUser } from "@/model/hub-model";

type MobileSpotlightSearchProps = {
  query: string;
  user?: HubUser;
  onQueryChange: (value: string) => void;
};

const initialsOf = (user?: HubUser): string =>
  String(user?.name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

const MobileSpotlightSearch = memo(
  ({ query, user, onQueryChange }: MobileSpotlightSearchProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (!isExpanded) return;
      const focusTimer = window.setTimeout(
        () => inputRef.current?.focus(),
        180,
      );
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 px-4 sm:hidden">
        {isExpanded && (
          <button
            type="button"
            aria-label="Close search"
            onClick={collapse}
            className="pointer-events-auto fixed inset-0 z-0 bg-background/20 backdrop-blur-[3px]"
          />
        )}

        <div className="pointer-events-auto relative z-10 mx-auto grid h-14 max-w-sm grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3 rounded-full border border-white/40 bg-card/70 px-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-card/60">
          <div className="flex justify-start [&_button]:h-10 [&_button]:w-10 [&_svg]:h-5 [&_svg]:w-5">
            <ThemeToggle />
          </div>

          <div
            className={cn(
              "flex h-10 min-w-0 justify-center justify-self-center items-center overflow-hidden rounded-full transition-all duration-300",
              isExpanded
                ? "bg-background/60 px-2 ring-1 ring-border"
                : "w-[160px] border border-border/60 bg-background/40 px-1",
            )}
          >
            <button
              type="button"
              aria-label="Search applications"
              onClick={() => setIsExpanded(true)}
              className={cn(
                "flex h-10 shrink-0 items-center rounded-full text-foreground transition-all duration-300",
                isExpanded
                  ? "w-8 justify-start"
                  : "w-full justify-start gap-2 px-2",
              )}
            >
              <Search className="h-5 w-5 shrink-0" aria-hidden="true" />

              {!isExpanded && (
                <span className="text-sm text-muted-foreground">Search</span>
              )}
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
                "h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground transition-opacity duration-200 ",
                isExpanded
                  ? "opacity-100"
                  : "pointer-events-none w-0 opacity-0",
              )}
            />

            {isExpanded && query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clear}
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <Link
            to="/profile"
            aria-label="Open profile"
            className="flex h-10 w-10 justify-self-end rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs">
                {initialsOf(user)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    );
  },
);

MobileSpotlightSearch.displayName = "MobileSpotlightSearch";
export default MobileSpotlightSearch;
