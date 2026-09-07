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
          "fixed inset-0 z-40 bg-slate-900/20 lg:hidden",
          isMobileOpen ? "block" : "hidden",
        )}
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "border-r border-slate-200 bg-white",
          "transition-all duration-200 ease-out",
          "lg:translate-x-0",
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
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

            <div
              className={cn(
                "min-w-0",
                !isOpen && "lg:hidden",
              )}
            >
              <p className="truncate text-[20px] font-bold tracking-[-0.02em] text-slate-800">
                MWS Hub
              </p>

              <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                Admin
              </p>
            </div>
          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
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
              "mb-3 px-3 text-[11px] font-medium uppercase tracking-wide text-slate-400",
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

                    <span
                      className={cn(
                        "truncate",
                        !isOpen && "lg:hidden",
                      )}
                    >
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
                      "text-[14px] font-medium",
                      "transition-colors duration-150",
                      !isOpen && "lg:justify-center lg:px-0",

                      isActive
                        ? [
                            "bg-indigo-50",
                            "text-indigo-600",
                          ]
                        : [
                            "text-slate-600",
                            "hover:bg-slate-50",
                            "hover:text-slate-800",
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
                            ? "text-indigo-600"
                            : "text-slate-500 group-hover:text-slate-700",
                        )}
                      />

                      <span
                        className={cn(
                          "truncate",
                          !isOpen && "lg:hidden",
                        )}
                      >
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