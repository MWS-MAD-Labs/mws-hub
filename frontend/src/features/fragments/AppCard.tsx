import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

type AppCardProps = {
  app: HubApplication;
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

const AppCard = memo(
  ({ app, onRequestAccess, onReportProblem }: AppCardProps) => {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const Icon = getAppIcon(app.icon);

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

    return (
      <article
        className={cn(
          "group relative flex w-full min-w-0 max-w-[6.75rem] flex-col sm:max-w-none items-center justify-start text-center transition-transform duration-150",
          isOpenable ? "active:scale-[0.94]" : "opacity-50",
        )}
      >
        <span className="relative shrink-0">
          {app.status === "new" && isOpenable && (
            <span className="absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-semibold uppercase sm:-top-2 sm:px-2 sm:text-[10px] leading-none text-primary-foreground shadow-sm">
              New
            </span>
          )}
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 sm:h-[72px] sm:w-[72px] sm:rounded-2xl ring-border/55 shadow-[0_2px_8px_rgba(15,23,42,0.08)]",
              getCategoryTone(app.category),
              // A logo has its own colors, so it sits on white instead of the category color.
              app.logo && "bg-white",
              !isOpenable && "grayscale opacity-60",
            )}
          >
            {app.logo ? (
              <img
                src={`${env.hubApiBaseUrl}/apps/${encodeURIComponent(app.id)}/logo?v=${app.logo.version}`}
                alt=""
                className="h-full w-full object-contain p-1 sm:p-1.5"
                loading="lazy"
              />
            ) : (
              <Icon className="h-5 w-5 sm:h-8 sm:w-8" strokeWidth={1.8} />
            )}
          </span>
        </span>
        <div className="mt-1 flex w-full min-w-0 flex-col items-center justify-center gap-0.5 sm:mt-2">
          <div className="flex w-full min-w-0 items-center justify-center gap-1">
            <h3 className="min-w-0 max-w-full overflow-hidden text-[11px] font-semibold leading-[14px] tracking-normal text-foreground sm:text-sm sm:leading-5">
              <span className="line-clamp-2">{app.name}</span>
            </h3>
          </div>

          {canRequestAccess && (
            <button
              type="button"
              onClick={() => onRequestAccess?.(app)}
              className="relative z-10 mt-1 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] font-medium leading-none text-muted-foreground shadow-sm sm:px-2.5 sm:py-1 sm:text-xs"
            >
              Request Access
            </button>
          )}

          {canReportProblem && (
            <button
              type="button"
              onClick={() => onReportProblem?.(app)}
              className="relative z-10 mt-0.5 text-[9px] font-medium leading-none sm:mt-1 sm:text-xs text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
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
            onClick={handleLaunchClick}
            className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="sr-only">{`Open ${app.name} in a new tab`}</span>
          </a>
        )}
      </article>
    );
  },
);

AppCard.displayName = "AppCard";

export default AppCard;
