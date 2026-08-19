import { memo } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ThemeToggle from "./ThemeToggle";
import Logo from "@/assets/logo.webp";
import type { HubUser } from "@/model/hub-model";

const initialsOf = (user?: HubUser): string =>
  String(user?.name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

type HubHeaderProps = {
  user?: HubUser;
};

// Thin utility bar only: identity on the left, the user on the right. Search
// moved into the page body - it belongs with the content it filters, and a
// launcher's first screen should lead with the search field, not bury it in
// chrome.
const HubHeader = memo(({ user }: HubHeaderProps) => (
  <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
    <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
      <Link
        to="/support-hub"
        className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img src={Logo} alt="" className="h-6 w-6 object-contain" loading="lazy" />
        <span className="text-sm font-semibold tracking-tight text-foreground">MWS Hub</span>
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
        >
          <span className="hidden text-xs font-medium text-muted-foreground sm:block">
            {user?.name || "Profile"}
          </span>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{initialsOf(user)}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </div>
  </header>
));

HubHeader.displayName = "HubHeader";
export default HubHeader;
