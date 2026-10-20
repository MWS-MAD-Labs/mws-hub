import { memo } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Logo from "@/assets/logo.webp";
import type { HubUser } from "@/model/hub-model";
import InstallAppButton from "./InstallAppButton";

const initialsOf = (user?: HubUser): string =>
  String(user?.name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

type HubHeaderProps = {
  user?: HubUser;
  isAdmin?: boolean;
};

const HubHeader = memo(({ user, isAdmin }: HubHeaderProps) => (
  <header className="sticky top-0 z-[var(--layer-sticky)] border-b border-border/60 bg-background/95 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1600px] items-center px-8 xl:px-10">
      <Link
        to="/support-hub"
        className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img src={Logo} alt="" className="h-7 w-7 object-contain" loading="lazy" />
        <span className="text-sm font-semibold tracking-[-0.01em] text-foreground">MWS Hub</span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <InstallAppButton />

        {isAdmin ? (
          <Link
            to="/admin"
            className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:flex"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Admin Dashboard
          </Link>
        ) : null}

        <div className="hidden items-center gap-1.5 sm:flex">
          <Link
            to="/profile"
            className="flex h-9 items-center gap-2 rounded-full py-1 pl-2 pr-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-1"
          >
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">
              {user?.name || "Profile"}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px]">{initialsOf(user)}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </div>
  </header>
));

HubHeader.displayName = "HubHeader";
export default HubHeader;
