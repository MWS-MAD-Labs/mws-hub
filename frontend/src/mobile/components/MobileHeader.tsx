import { memo } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import type { HubUser } from "@/model/hub-model";
import { cn } from "@/lib/utils";
import { getGreeting } from "@/mobile/utils/Greeting";
import InstallAppButton from "@/features/fragments/InstallAppButton";

type MobileHeaderProps = {
  user?: HubUser;
  className?: string;
  // Shows the Admin Dashboard button (tablet and desktop only).
  isAdmin?: boolean;
};

const MobileHeader = memo(({ user, className, isAdmin }: MobileHeaderProps) => (
  <header
    className={cn(
      "sticky top-0 z-[var(--layer-sticky)] border-b border-border/50 bg-background/92 backdrop-blur-xl sm:hidden",
      className,
    )}
  >
    <div className="flex h-14 items-center gap-3 px-4">
      <Link
        to="/profile"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Profile"
      >
        <Avatar className="h-9 w-9">
          {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
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

      {isAdmin && (
        <Link
          to="/admin"
          className="hidden h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Admin Dashboard
        </Link>
      )}

      {/* Icon-only on phones, the labelled "Install App" button from tablet up.
          `contents` keeps an empty wrapper out of the flex gap when the
          browser offers no install prompt. */}
      <span className="contents sm:hidden">
        <InstallAppButton variant="compact" />
      </span>
      <span className="hidden sm:contents">
        <InstallAppButton />
      </span>
    </div>
  </header>
));

MobileHeader.displayName = "MobileHeader";

export default MobileHeader;
