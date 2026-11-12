import { memo, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, X } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import type { HubUser } from "@/model/hub-model";

type MobileSpotlightSearchProps = {
  query: string;
  user?: HubUser;
  onQueryChange: (value: string) => void;
  /** Tampilkan tombol GPT Code hanya untuk user yang punya akses. */
  showGptCode?: boolean;

  searchOnHub?: boolean;
};

// Set by a page that sends the user to the Hub to search.
type HubSearchState = { openSearch?: boolean } | null;

const ICON_BUTTON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MobileSpotlightSearch = memo(
  ({
    query,
    user,
    onQueryChange,
    showGptCode = true,
    searchOnHub = false,
  }: MobileSpotlightSearchProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(
      () =>
        !searchOnHub && Boolean((location.state as HubSearchState)?.openSearch),
    );
    const inputRef = useRef<HTMLInputElement>(null);

    // Forget the "open search" request once used, so a reload or Back does
    // not open the search again.
    useEffect(() => {
      if (!searchOnHub && (location.state as HubSearchState)?.openSearch) {
        navigate(`${location.pathname}${location.search}`, {
          replace: true,
          state: null,
        });
      }
    }, [
      searchOnHub,
      location.state,
      location.pathname,
      location.search,
      navigate,
    ]);

    const openSearch = () => {
      if (searchOnHub) {
        navigate("/support-hub", { state: { openSearch: true } });
        return;
      }
      setIsExpanded(true);
    };

    useEffect(() => {
      if (isExpanded) inputRef.current?.focus();
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
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[var(--layer-floating)] px-4">
        {isExpanded && (
          <button
            type="button"
            aria-label="Close search"
            onClick={collapse}
            className="pointer-events-auto fixed inset-0 z-0 bg-background/20 backdrop-blur-[3px]"
          />
        )}

        <div className="pointer-events-auto relative z-10 mx-auto flex h-14 max-w-sm items-center gap-2 sm:max-w-[420px] rounded-full border border-white/40 bg-card/70 px-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-card/60">
          {/* Left actions */}
          <div className="flex shrink-0 items-center gap-1">
            {searchOnHub ? (
              // Off the Hub the first slot leads back home instead of
              // switching the theme.
              <Link
                to="/support-hub"
                aria-label="Back to Hub"
                title="Back to Hub"
                className={cn(
                  ICON_BUTTON,
                  "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Home className="h-5 w-5" aria-hidden="true" />
              </Link>
            ) : (
              <div className="[&_button]:h-10 [&_button]:w-10 [&_svg]:h-5 [&_svg]:w-5">
                <ThemeToggle />
              </div>
            )}

            {showGptCode && (
              <NavLink
                to="/gpt-code"
                aria-label="ChatGPT Verification Code"
                className={({ isActive }) =>
                  cn(
                    ICON_BUTTON,
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )
                }
              >
                <img
                  src="/ChatGPT-Logo.svg"
                  alt=""
                  className="h-5 w-5 object-contain"
                  aria-hidden="true"
                />
              </NavLink>
            )}
          </div>

          {/* Search */}
          <div
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center rounded-full border px-3 transition-colors duration-200",
              isExpanded
                ? "border-transparent bg-background/60 ring-1 ring-border"
                : "border-border/60 bg-background/40",
            )}
          >
            <button
              type="button"
              aria-label="Search applications"
              onClick={openSearch}
              className={cn(
                "flex h-full items-center gap-2 text-foreground",
                isExpanded ? "shrink-0" : "min-w-0 flex-1",
              )}
            >
              <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!isExpanded && (
                <span className="truncate text-sm text-muted-foreground">
                  Search apps...
                </span>
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
              placeholder="Search apps..."
              aria-label="Search applications"
              className={cn(
                "h-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
                isExpanded ? "ml-2 flex-1" : "hidden",
              )}
            />

            {isExpanded && query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clear}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Profile */}
          <NavLink
            to="/profile"
            aria-label="Open profile"
            className={({ isActive }) =>
              cn(
                ICON_BUTTON,
                "p-0",
                isActive &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-card",
              )
            }
          >
            <Avatar className="h-10 w-10">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
            </Avatar>
          </NavLink>
        </div>
      </div>
    );
  },
);

MobileSpotlightSearch.displayName = "MobileSpotlightSearch";
export default MobileSpotlightSearch;
