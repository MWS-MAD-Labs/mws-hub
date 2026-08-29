import {
  AppWindow,
  BarChart3,
  ClipboardList,
  Home,
  LifeBuoy,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import Logo from "@/assets/logo.webp";
import { cn } from "@/lib/utils";

type SidebarProps = {
  isOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: Home, enabled: true },
  {
    label: "Application Catalog",
    href: "/admin/catalog",
    icon: AppWindow,
    enabled: true,
  },
  { label: "Status Toggles", href: "#", icon: BarChart3, enabled: false },
  { label: "Feedback", href: "/admin/feedback", icon: LifeBuoy, enabled: true },
  { label: "Audit Notes", href: "#", icon: ClipboardList, enabled: false },
];

export default function Sidebar({
  isOpen,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden",
          isMobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/60 bg-card transition-transform duration-200 ease-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isOpen ? "lg:w-64" : "lg:w-20",
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-border/60 px-4">
          <img src={Logo} alt="" className="h-7 w-7 object-contain" />
          <div className={cn("min-w-0", !isOpen && "lg:hidden")}>
            <p className="truncate text-sm font-semibold">MWS Hub</p>
            <p className="truncate text-xs text-muted-foreground">Admin</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 hover:bg-background lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            if (!item.enabled) {
              return (
                <div
                  key={item.label}
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground/60"
                  title={item.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn("truncate", !isOpen && "lg:hidden")}>
                    {item.label}
                  </span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.href}
                end
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-background",
                  )
                }
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", !isOpen && "lg:hidden")}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
