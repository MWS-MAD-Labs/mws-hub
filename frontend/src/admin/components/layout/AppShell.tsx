import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebard";
import ThemeToggle from "@/features/fragments/ThemeToggle";
import "./admin-theme.css";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMobileSidebarOpen(false);
      window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="admin-theme admin-shell min-h-screen">
      <Sidebar
        isOpen={isSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          isSidebarOpen ? "lg:pl-[270px]" : "lg:pl-[72px]",
        )}
      >
        <header className="sticky top-0 z-[var(--layer-sticky)] border-b border-[var(--admin-border)] bg-[var(--admin-card)]/95 backdrop-blur-xl">
          <div className="flex h-[60px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="admin-focus inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-card-subtle)] lg:hidden"
              aria-label="Open sidebar"
              aria-expanded={isMobileSidebarOpen}
              aria-controls="admin-navigation-drawer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              className="admin-focus hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-card-subtle)] lg:inline-flex"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>

            <div className="min-w-0">
              <p className="admin-heading truncate text-sm font-bold text-[var(--admin-text)]">MWS Admin</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Hub administration
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div>
                {/* <Notification /> */}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle variant="admin" />
                <Link
                  to="/support-hub"
                  className="admin-focus rounded-full border border-[var(--admin-border-strong)] px-3 py-2 text-xs font-bold text-[var(--admin-text)] hover:bg-[var(--admin-card-subtle)]"
                >
                  Hub
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
