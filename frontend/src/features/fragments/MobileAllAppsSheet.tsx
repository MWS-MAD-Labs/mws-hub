import { memo, type RefObject } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { getOverlayRoot } from "@/components/overlays/portal";
import ScopeAppGroups from "./ScopeAppGroups";
import type {
  HubApplication,
  HubCategoryFilterOption,
} from "@/model/hub-model";

type MobileAllAppsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where focus goes when the sheet closes (a tap does not focus the trigger).
  returnFocusRef?: RefObject<HTMLElement>;
  apps: HubApplication[];
  scopes: HubCategoryFilterOption[];
  onClearFilters: () => void;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

// Every app the current search allows, grouped by scope, in a sheet
// that rises from the bottom. The front grid shows the first eight.
const MobileAllAppsSheet = memo(
  ({
    open,
    onOpenChange,
    returnFocusRef,
    apps,
    scopes,
    onClearFilters,
    onRequestAccess,
    onReportProblem,
  }: MobileAllAppsSheetProps) => {
    const portalRoot = getOverlayRoot();

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal container={portalRoot ?? undefined}>
          <Dialog.Overlay className="fixed inset-0 z-[var(--layer-modal)] bg-black/45 backdrop-blur-[1px] motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              const target = returnFocusRef?.current;
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }}
            onEscapeKeyDown={(event) => {
              // Escape belongs to an app detail popup opened from this sheet,
              // even in the instant before Radix has stacked that popup on top.
              if (document.querySelector("[data-app-detail]")) {
                event.preventDefault();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-[var(--layer-modal)] flex max-h-[85dvh] flex-col rounded-t-[22px] border-t border-border/60 bg-card pb-[env(safe-area-inset-bottom)] text-card-foreground shadow-2xl duration-300 focus:outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-bottom sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-[880px] sm:-translate-x-1/2 sm:border-x"
          >
            <div className="shrink-0 px-4 pt-2">
              <span
                aria-hidden="true"
                className="mx-auto block h-1 w-10 rounded-full bg-muted-foreground/25"
              />
              <div className="mt-1 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-base font-semibold text-foreground">
                    All apps
                  </Dialog.Title>
                  <p className="text-xs text-muted-foreground">
                    All scopes · {apps.length} apps
                  </p>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Dialog.Close>
              </div>
            </div>

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/50 px-3 pb-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {apps.length > 0 ? (
                <ScopeAppGroups
                  apps={apps}
                  scopes={scopes}
                  className="space-y-4"
                  onRequestAccess={onRequestAccess}
                  onReportProblem={onReportProblem}
                />
              ) : (
                <div className="mt-3 flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/50 text-sm font-medium text-muted-foreground">
                  No apps found
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="min-h-11 rounded-full px-4 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  },
);

MobileAllAppsSheet.displayName = "MobileAllAppsSheet";

export default MobileAllAppsSheet;
