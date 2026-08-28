import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "@/features/fragments/ThemeToggle";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebard";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        isOpen={isSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          isSidebarOpen ? "lg:pl-64" : "lg:pl-20",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 hover:bg-card lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-border/60 hover:bg-card lg:inline-flex"
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">MWS Admin</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                MAD Labs dashboard access
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <Link
                to="/support-hub"
                className="rounded-md border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-card"
              >
                Hub
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
