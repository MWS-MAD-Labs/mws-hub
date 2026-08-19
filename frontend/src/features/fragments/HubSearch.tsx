import { memo, useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

const isTypingTarget = (element: EventTarget | null): boolean => {
  const el = element as HTMLElement | null;
  const tag = el?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || Boolean(el?.isContentEditable);
};

type HubSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

// Full-width and directly under the page title: in a launcher, typing is the
// fastest path to an app, so the search field is the page's primary control
// rather than a header accessory.
const HubSearch = memo(({ query, onQueryChange }: HubSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" to focus - the shortcut people already expect from internal tools.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = useCallback(() => {
    onQueryChange("");
    inputRef.current?.focus();
  }, [onQueryChange]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search applications…"
        aria-label="Search applications"
        className="h-11 w-full rounded-lg border border-border/60 bg-card/50 pl-10 pr-16 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/25"
      />
      {query ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
          /
        </kbd>
      )}
    </div>
  );
});

HubSearch.displayName = "HubSearch";
export default HubSearch;
