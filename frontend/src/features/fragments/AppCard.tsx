import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Lock,
  Wrench,
  Clock3,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAppIcon, getCategoryTone } from "@/data/hubCategories";
import { env } from "@/config/env";
import { loadHiddenIframe } from "@/lib/hiddenIframe";
import { probeAuthenticated } from "@/lib/authProbe";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { HubApplication } from "@/model/hub-model";

type BlockedKey = "locked" | "maintenance" | "coming_soon" | "no_link";

type BlockedConfig = {
  icon: LucideIcon;
  text: (app: HubApplication) => string;
};

const BLOCKED: Record<BlockedKey, BlockedConfig> = {
  locked: {
    icon: Lock,
    text: (app) => `Available to ${app.audience}`,
  },
  maintenance: {
    icon: Wrench,
    text: () => "Temporarily unavailable",
  },
  coming_soon: {
    icon: Clock3,
    text: () => "Not released yet",
  },
  no_link: {
    icon: Unlink,
    text: () => "No link registered yet",
  },
};

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

    const blocked = blockedKey ? BLOCKED[blockedKey] : null;

    const BlockedIcon = blocked?.icon;
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
        description: "Beralih ke tab tersebut untuk melanjutkan.",
      });
    };

    return (
      <article
        className={cn(
          // ============================================================
          // MOBILE
          // ============================================================
          "group relative flex w-full min-w-0 max-w-[6.75rem]",
          "flex-col items-center justify-start",
          "text-center",
          "transition-transform duration-150",

          isOpenable ? "active:scale-[0.94]" : "opacity-50",

          // ============================================================
          // DESKTOP
          // ============================================================
          "sm:h-full sm:min-h-[9.5rem] sm:max-w-none sm:flex-col sm:items-start",
          "sm:justify-start sm:gap-3",
          "sm:overflow-visible sm:rounded-none",
          "sm:border sm:border-border/70",
          "sm:bg-card/65 sm:p-4",
          "sm:text-left sm:shadow-none sm:transition-colors",

          isOpenable
            ? "sm:active:scale-100 sm:hover:border-primary/25 sm:hover:bg-card"
            : "sm:opacity-70",

          "sm:focus-within:border-ring sm:focus-within:bg-card",
        )}
      >
        {/* ============================================================
            APP ICON
            ============================================================ */}
        <span className="relative shrink-0">
          {app.status === "new" && isOpenable && (
            <span
              className="
                absolute
                -top-1.5
                left-1/2
                z-10
                -translate-x-1/2
                rounded-full
                bg-primary
                px-1.5
                py-0.5
                text-[8px]
                font-semibold
                uppercase
                leading-none
                text-primary-foreground
                shadow-sm
                sm:hidden
              "
            >
              New
            </span>
          )}
          <span
            className={cn(
              "flex h-12 w-12 shrink-0",
              "items-center justify-center",
              "overflow-hidden",
              "rounded-xl",

              "ring-1 ring-border/55",
              "shadow-[0_2px_8px_rgba(15,23,42,0.08)]",

              getCategoryTone(app.category),

              !isOpenable && "grayscale opacity-60",

              // Desktop
              "sm:h-12 sm:w-12",
              "sm:rounded-none",
              "sm:ring-border/45",
              "sm:shadow-none",
            )}
          >
            <Icon
              className="
                h-5 w-5
                sm:h-5 sm:w-5
              "
              strokeWidth={1.8}
            />
          </span>
        </span>
        <div
          className="
            mt-1
            flex
            flex-col
            items-center
            w-full
            min-w-0
            justify-center
            gap-0.5

            sm:mt-0
            sm:flex
            sm:h-full
            sm:w-auto
            sm:flex-1
            sm:flex-col
            sm:items-start
          "
        >
          <div
            className="
              flex
              min-w-0
              w-full
              items-center
              justify-center
              gap-1

              sm:justify-start
            "
          >
            <h3
              className="
                min-w-0
                max-w-full
                overflow-hidden

                text-[11px]
                font-semibold
                leading-[14px]
                tracking-normal
                text-foreground

                sm:max-w-full
                sm:truncate
                sm:text-sm
                sm:font-semibold
                sm:leading-normal
                sm:tracking-normal
              "
            >
              <span className="line-clamp-2">{app.name}</span>
            </h3>

            {/* New */}
            {app.status === "new" && isOpenable && (
              <span
                className="
                  hidden
                  shrink-0
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-primary
                  sm:rounded-full
                  sm:bg-primary/10
                  sm:px-1.5
                  sm:py-0.5
                  sm:text-[9px]
                  sm:leading-none
                  sm:inline
                "
              >
                New
              </span>
            )}

            {/* External — desktop only */}
            {isOpenable && app.external && (
              <ArrowUpRight
                className="
                  ml-auto
                  hidden
                  h-3.5
                  w-3.5
                  shrink-0
                  text-muted-foreground
                  opacity-0
                  transition-opacity
                  group-hover:opacity-100
                  sm:block
                "
                aria-hidden="true"
              />
            )}
          </div>

          <p className="mt-1.5 hidden text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
            {app.description}
          </p>

          {/* ============================================================
              BLOCKED — DESKTOP ONLY
              ============================================================ */}
          {blocked && BlockedIcon && (
            <p
              className="
                mt-1
                hidden
                items-center
                gap-1.5
                text-[11px]
                text-muted-foreground/80
                sm:flex
              "
            >
              <BlockedIcon className="h-3 w-3 shrink-0" aria-hidden="true" />

              <span className="truncate">{blocked.text(app)}</span>

              {canRequestAccess && (
                <button
                  type="button"
                  onClick={() => onRequestAccess?.(app)}
                  className="
                    relative
                    z-10
                    ml-auto
                    shrink-0
                    font-medium
                    text-foreground
                    underline-offset-2
                    hover:underline
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                >
                  Request
                </button>
              )}
            </p>
          )}

          {canRequestAccess && (
            <button
              type="button"
              onClick={() => onRequestAccess?.(app)}
              className="relative z-10 mt-1 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[9px] font-medium leading-none text-muted-foreground shadow-sm sm:hidden"
            >
              Request Access
            </button>
          )}

          {canReportProblem && (
            <button
              type="button"
              onClick={() => onReportProblem?.(app)}
              className="relative z-10 mt-0.5 text-[9px] font-medium leading-none text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline sm:hidden"
            >
              Report
            </button>
          )}

          {canReportProblem && (
            <button
              type="button"
              onClick={() => onReportProblem?.(app)}
              className="relative z-10 mt-1 hidden text-[10px] text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline sm:mt-auto sm:block sm:pt-3"
            >
              Report a problem
            </button>
          )}
        </div>

        {/* ============================================================
            CLICK TARGET
            ============================================================ */}
        {isOpenable && launchHref && (
          <a
            href={launchHref}
            target={launchWindowName}
            rel="noopener noreferrer"
            onClick={handleLaunchClick}
            className="
    absolute
    inset-0
    focus:outline-none
    focus-visible:ring-2
    focus-visible:ring-ring
  "
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
