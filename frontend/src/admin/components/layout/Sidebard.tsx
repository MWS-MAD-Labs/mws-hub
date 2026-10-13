import {
  ClipboardList,
  Home,
  KeyRound,
  Wrench,
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
    label: "Broken Tools",
    href: "/admin/broken-tools",
    icon: Wrench,
    enabled: true,
  },
  {
    label: "Access Requests",
    href: "/admin/access-requests",
    icon: KeyRound,
    enabled: true,
  },

  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    icon: ClipboardList,
    enabled: true,
  },
];

export default function Sidebar({
  isOpen,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[var(--layer-drawer-backdrop)] bg-slate-900/20 lg:hidden",
          isMobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
      />

      <aside
        id="admin-navigation-drawer"
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--layer-drawer)] flex flex-col",
          "border-r border-[var(--admin-border)] bg-[var(--admin-card)]",
          "transition-all duration-200 ease-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isOpen ? "lg:w-[270px]" : "lg:w-[72px]",
          "w-[270px]",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-[88px] shrink-0 items-center px-6",
            !isOpen && "lg:justify-center lg:px-0",
          )}
        >
          <div className="flex items-center gap-3">
            <img
              src={Logo}
              alt=""
              className="h-9 w-9 shrink-0 object-contain"
            />

            <div className={cn("min-w-0", !isOpen && "lg:hidden")}>
              <p className="admin-heading truncate text-[18px] font-extrabold tracking-[-0.02em] text-[var(--admin-text)]">
                MWS Hub
              </p>

              <p className="mt-0.5 truncate text-xs font-medium text-[var(--admin-text-tertiary)]">
                Admin
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="admin-focus ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--admin-text-tertiary)] transition-colors hover:bg-[var(--admin-card-subtle)] hover:text-[var(--admin-text)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto",
            "px-4 pb-6",
            !isOpen && "lg:px-2",
          )}
        >
          {/* Section label */}
          <div
            className={cn(
              "admin-heading mb-3 px-3 text-[10px] font-bold text-[var(--admin-text-tertiary)]",
              !isOpen && "lg:hidden",
            )}
          >
            Menu
          </div>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              if (!item.enabled) {
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3",
                      "text-[14px] font-medium text-slate-400",
                      "cursor-not-allowed",
                    )}
                    title={item.label}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.7]" />

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
                      "group flex h-11 items-center gap-3 rounded-lg px-3",
                      "admin-heading text-[13px] font-bold",
                      "transition-colors duration-150",
                      !isOpen && "lg:justify-center lg:px-0",

                      isActive
                        ? ["bg-[var(--admin-brand-soft)]", "text-[var(--admin-brand)]"]
                        : [
                            "text-[var(--admin-text-secondary)]",
                            "hover:bg-[var(--admin-card-subtle)]",
                            "hover:text-[var(--admin-text)]",
                          ],
                    )
                  }
                  title={item.label}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 stroke-[1.7]",
                          isActive
                            ? "text-[var(--admin-brand)]"
                            : "text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text)]",
                        )}
                      />

                      <span className={cn("truncate", !isOpen && "lg:hidden")}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
