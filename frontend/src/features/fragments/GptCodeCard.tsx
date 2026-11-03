import { memo } from "react";
import { Link } from "react-router-dom";

// GPT Code lives in Hub itself (route /gpt-code), not in Central's catalog,
// so it gets its own card instead of an AppCard. Same geometry as the
// desktop AppCard so it sits in the grid like any other tile. Tablet and
// desktop only: on mobile the bottom bar already carries the GPT Code button.
const GptCodeCard = memo(() => (
  <article className="relative hidden min-h-[88px] min-w-0 overflow-hidden rounded-md border border-border/70 bg-card transition-colors duration-150 hover:border-border sm:block">
    <Link
      to="/gpt-code"
      className="flex min-h-[86px] w-full min-w-0 items-center gap-3.5 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md bg-card ring-1 ring-border/55"
      >
        <img src="/ChatGPT-Logo.svg" alt="" className="h-6 w-6 object-contain dark:invert" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">GPT Code</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          ChatGPT Verification Code
        </span>
      </span>
    </Link>
  </article>
));

GptCodeCard.displayName = "GptCodeCard";

export default GptCodeCard;
