import { memo } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Logo from "@/assets/logo.webp";
import type { HubUser } from "@/model/hub-model";
import InstallAppButton from "./InstallAppButton";
import ThemeToggle from "./ThemeToggle";

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
  <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6 lg:px-8">
      <Link
        to="/support-hub"
        className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img src={Logo} alt="" className="h-6 w-6 object-contain" loading="lazy" />
        <span className="font-heading text-sm font-bold tracking-tight text-foreground">MWS Hub</span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <InstallAppButton />
        <ThemeToggle variant="compact" />
        {isAdmin ? (
          <Link
            to="/admin"
            className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:flex"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Admin Dashboard
          </Link>
        ) : null}

        <div className="hidden items-center gap-1.5 sm:flex">
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
    </div>
  </header>
));

HubHeader.displayName = "HubHeader";
export default HubHeader;
