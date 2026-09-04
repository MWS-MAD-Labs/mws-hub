import { memo } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { HubUser } from "@/model/hub-model";
import { getGreeting } from "@/mobile/utils/Greeting";

const initialsOf = (user?: HubUser): string =>
  String(user?.name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

type MobileHeaderProps = {
  user?: HubUser;
};

const MobileHeader = memo(({ user }: MobileHeaderProps) => (
  <header className="sticky top-0 z-30 border-b border-border/50 bg-background/92 backdrop-blur-xl sm:hidden">
    <div className="flex h-14 items-center gap-3 px-4">
      <Link
        to="/profile"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Profile"
      >
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-[10px]">
            {initialsOf(user)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1 leading-none">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {getGreeting()}, {user?.name || "MWS Hub"}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">
          Welcome back to MWS Hub
        </p>
      </div>
    </div>
  </header>
));

MobileHeader.displayName = "MobileHeader";

export default MobileHeader;
