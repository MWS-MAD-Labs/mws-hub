import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { getOverlayRoot } from "@/components/overlays/portal";
import { setSkipAppDetail, shouldSkipAppDetail } from "./appDetailPreference";
import { cn } from "@/lib/utils";
import { getAppIcon, getCategoryTone } from "@/data/hubCategories";
import { env } from "@/config/env";
import { loadHiddenIframe } from "@/lib/hiddenIframe";
import { probeAuthenticated } from "@/lib/authProbe";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { HubApplication } from "@/model/hub-model";

type BlockedKey = "locked" | "maintenance" | "coming_soon" | "no_link";

const blockedKeyOf = (app: HubApplication): BlockedKey | null => {
  if (app.status === "maintenance") return "maintenance";
  if (app.status === "coming_soon") return "coming_soon";
  if (!app.href) return "no_link";
  if (app.access === "locked") return "locked";

  return null;
};

const isPlainLeftClick = (event: React.MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

type AppCardProps = {
  app: HubApplication;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
  className?: string;
};

const AppCard = memo(
  ({ app, onRequestAccess, onReportProblem, className }: AppCardProps) => {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const Icon = getAppIcon(app.icon);
    const tileLinkRef = useRef<HTMLAnchorElement>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const description = app.description.trim();

    // Radix registers the dialog's Escape handling only after the popup has
    // painted. Listen from the moment it opens, so an early Escape closes the
    // popup instead of slipping through to the All apps sheet behind it.
    useEffect(() => {
      if (!isDetailOpen) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setIsDetailOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [isDetailOpen]);
    const logoSrc = app.logo
      ? `${env.hubApiBaseUrl}/apps/${encodeURIComponent(app.id)}/logo?v=${app.logo.version}`
      : null;

    const blockedKey = blockedKeyOf(app);
    const isOpenable = !blockedKey;
    const canRequestAccess =
      blockedKey === "locked" && Boolean(onRequestAccess);
    const canReportProblem =
      Boolean(onReportProblem) && (isOpenable || blockedKey === "no_link");

    const launchId = app.ssoAppId || app.id;

    const launchHref = `${env.hubApiBaseUrl}/apps/${encodeURIComponent(
      launchId,
    )}/launch`;
    const launchWindowName = `mws-launch-${launchId}`;

    const handleLaunchClick = async (
      event: React.MouseEvent<HTMLAnchorElement>,
    ) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (window.matchMedia("(pointer: coarse)").matches) {
        return;
      }

      event.preventDefault();

      let target = window.open("", launchWindowName);
      if (!target) {
        window.location.assign(launchHref);
        return;
      }

      if (target === window) {
        window.name = "";
        target = window.open("", launchWindowName);
        if (!target) {
          window.location.assign(launchHref);
          return;
        }
      }

      let isFreshWindow = true;
      try {
        isFreshWindow =
          target.location.href === "about:blank" || target.location.href === "";
      } catch {
        isFreshWindow = false;
      }
      const currentUser = await refreshUser();
      if (!currentUser) {
        if (isFreshWindow) target.close();
        navigate("/login?error=session_expired");
        return;
      }

      if (isFreshWindow) {
        target.location.href = launchHref;
        return;
      }

      loadHiddenIframe(launchHref, 8000)
        .then(() => probeAuthenticated(target, 1500))
        .then((authenticated) => {
          if (authenticated) {
            target.focus();
            return;
          }
          target.location.href = launchHref;
        });
      toast.info(`${app.name} sudah terbuka di tab lain`, {
        id: `open-${app.id}`,
        description: "Beralih ke tab tersebut untuk melanjutkan.",
      });
    };

    // A plain click on the tile opens the detail popup, unless the user chose
    // "Don't show this again". Modified clicks (new tab, etc.) stay native.
    const handleTileClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isPlainLeftClick(event)) return;
      if (shouldSkipAppDetail()) {
        void handleLaunchClick(event);
        return;
      }
      event.preventDefault();
      setDontShowAgain(false);
      setIsDetailOpen(true);
    };

    // "Open app" does exactly what the tile did before: same link, same
    // handler. The preference is saved only here, never on a plain close.
    const handleOpenFromDetail = (
      event: React.MouseEvent<HTMLAnchorElement>,
    ) => {
      if (dontShowAgain) setSkipAppDetail(true);
      void handleLaunchClick(event);
      // Close after the click: on touch devices the link navigates natively,
      // and a link removed from the page mid-click navigates nowhere.
      window.setTimeout(() => setIsDetailOpen(false), 0);
    };

    const portalRoot = getOverlayRoot();

    return (
      <>
        <article
          className={cn(
            "group relative flex w-full min-w-0 max-w-[6.75rem] flex-col sm:max-w-none items-center justify-start text-center transition-transform duration-150",
            isOpenable ? "active:scale-[0.94]" : "opacity-50",
            className,
          )}
        >
          <span className="relative shrink-0">
            {app.status === "new" && isOpenable && (
              <span className="absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-semibold uppercase sm:-top-2 sm:px-2 sm:text-[9px] leading-none text-primary-foreground shadow-sm">
                New
              </span>
            )}
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 sm:h-[60px] sm:w-[60px] sm:rounded-2xl ring-border/55 shadow-[0_2px_8px_rgba(15,23,42,0.08)]",
                getCategoryTone(app.category),
                // A logo has its own colors, so it sits on white instead of the category color.
                app.logo && "bg-white",
                !isOpenable && "grayscale opacity-60",
              )}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="h-full w-full object-contain p-1 sm:p-1.5"
                  loading="lazy"
                />
              ) : (
                <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.8} />
              )}
            </span>
          </span>
          <div className="mt-1 flex w-full min-w-0 flex-col items-center justify-center gap-0.5 sm:mt-2">
            <div className="flex w-full min-w-0 items-center justify-center gap-1">
              <h3 className="min-w-0 max-w-full overflow-hidden text-[11px] font-semibold leading-[14px] tracking-normal text-foreground sm:text-[13px] sm:leading-[18px]">
                <span className="line-clamp-2">{app.name}</span>
              </h3>
            </div>

            {canRequestAccess && (
              <button
                type="button"
                onClick={() => onRequestAccess?.(app)}
                className="relative z-10 mt-1 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] font-medium leading-none text-muted-foreground shadow-sm sm:px-2.5 sm:py-1 sm:text-[11px]"
              >
                Request Access
              </button>
            )}

            {canReportProblem && (
              <button
                type="button"
                onClick={() => onReportProblem?.(app)}
                className="relative z-10 mt-0.5 text-[9px] font-medium leading-none sm:mt-1 sm:text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
              >
                Report
              </button>
            )}
          </div>

          {isOpenable && launchHref && (
            <a
              href={launchHref}
              target={launchWindowName}
              rel="noopener noreferrer"
              ref={tileLinkRef}
              onClick={handleTileClick}
              className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="sr-only">{`Open ${app.name}`}</span>
            </a>
          )}
        </article>

        {isOpenable && (
          <Dialog.Root open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <Dialog.Portal container={portalRoot ?? undefined}>
              <Dialog.Overlay className="fixed inset-0 z-[var(--layer-modal)] bg-black/45 backdrop-blur-[1px] motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0" />
              <Dialog.Content
                {...(description ? {} : { "aria-describedby": undefined })}
                data-app-detail=""
                onCloseAutoFocus={(event) => {
                  // Back to the tile that opened it.
                  event.preventDefault();
                  tileLinkRef.current?.focus();
                }}
                className="fixed left-1/2 top-1/2 z-[var(--layer-modal)] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] border border-[#E7E1DB] bg-white p-6 text-center shadow-2xl duration-200 focus:outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-95 dark:border-border dark:bg-card"
              >
                <Dialog.Close
                  aria-label="Close"
                  className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-[#6D6560] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-muted-foreground"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Dialog.Close>

                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-auto mt-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-border/55 shadow-[0_2px_8px_rgba(15,23,42,0.08)]",
                    getCategoryTone(app.category),
                    logoSrc && "bg-white",
                  )}
                >
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt=""
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <Icon className="h-8 w-8" strokeWidth={1.8} />
                  )}
                </span>

                <Dialog.Title className="mt-4 text-lg font-semibold leading-snug text-foreground">
                  {app.name}
                </Dialog.Title>

                {description && (
                  <Dialog.Description className="mt-2 text-sm leading-relaxed text-[#6D6560] dark:text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}

                <a
                  href={launchHref}
                  target={launchWindowName}
                  rel="noopener noreferrer"
                  onClick={handleOpenFromDetail}
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#6B1D20] text-sm font-semibold text-white transition-colors hover:bg-[#6B1D20]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B1D20] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-card"
                >
                  Open app
                </a>

                <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-3 text-sm text-[#6D6560] dark:text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(event) => setDontShowAgain(event.target.checked)}
                    className="h-5 w-5 cursor-pointer rounded accent-[#6B1D20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B1D20] focus-visible:ring-offset-2"
                  />
                  Don&apos;t show this again
                </label>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </>
    );
  },
);

AppCard.displayName = "AppCard";

export default AppCard;
