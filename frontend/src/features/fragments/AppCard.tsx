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

    // Modifier/middle clicks (open in background tab, etc.) are left alone
    // and fall through to the anchor's own target/rel below - those always
    // open a new tab anyway, regardless of what this handler does.
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
      event.preventDefault();

      // Hub's session is a cookie, which - unlike localStorage - never
      // fires a cross-tab event this tab could react to. So this tab has
      // no passive way to learn its own session was cleared elsewhere
      // (e.g. by signing out of a satellite app in another tab): it just
      // keeps rendering as signed in until something asks. Check right
      // here, before opening or navigating anything, so a stale Hub tab
      // lands on Hub's own login screen immediately - instead of opening a
      // blank tab that dead-ends on the satellite's own "Session ended"
      // while this tab sits frozen until a manual refresh.
      const currentUser = await refreshUser();
      if (!currentUser) {
        navigate("/login?error=session_expired");
        return;
      }

      // window.open with an empty URL is the standard "find-or-create a
      // named window without navigating it" trick: it hands back the SAME
      // window if one with this name is already open anywhere in this
      // tab's browsing-context group, or a fresh blank one otherwise -
      // and it does this by asking the browser's own name registry, which
      // outlives a reload of THIS page (unlike a plain JS variable, which
      // a previous version of this relied on and which a Hub reload wipes
      // clean, silently falling back to the old flicker-y behavior).
      const target = window.open("", launchWindowName);
      if (!target) return; // popup blocked

      if (target === window) {
        // This tab's own window.name still carries a stale claim to
        // launchWindowName from an earlier life - e.g. it WAS the MTSS
        // tab, but then navigated in-place back to Hub itself (its own
        // "Sign in" button does a same-tab redirect, not a new tab), and
        // window.name survives an in-place navigation, even cross-origin.
        // Reusing "ourselves" as the reuse target would silently hijack
        // the tab the person is currently looking at Hub in - release the
        // stale name so it stops squatting on it, then open a genuinely
        // new tab like a first launch.
        window.name = "";
        window.open(launchHref, launchWindowName);
        return;
      }

      let isFreshWindow = true;
      try {
        // A window we just created is still about:blank and still
        // same-origin, so reading its location succeeds. One that already
        // navigated to the satellite app's origin throws instead on that
        // same read - that's the signal it's an existing, already-launched
        // tab rather than a blank new one.
        isFreshWindow =
          target.location.href === "about:blank" || target.location.href === "";
      } catch {
        isFreshWindow = false;
      }

      if (isFreshWindow) {
        target.location.href = launchHref;
        return;
      }

      // Existing tab: replay the handshake in a hidden iframe instead of
      // navigating this one, so there's usually no visible redirect chain.
      // The satellite app's own auth callback writes the fresh token to its
      // own localStorage regardless of visibility; the visible tab picks
      // it up live via the browser's `storage` event (see
      // mws-mtss-system's useCrossTabAuthSync) instead of ever reloading -
      // when that actually reaches it. Some browsers partition a hidden
      // iframe's storage away from the real tab's, so the write can
      // silently never arrive. probeAuthenticated asks the tab itself
      // whether it worked; if not, fall back to a real (visible, but
      // guaranteed) navigation of that same tab instead of leaving it
      // stuck on whatever it was showing before.
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
          "group relative flex w-full min-w-0",
          "flex-col items-center justify-start",
          "text-center",
          "transition-transform duration-150",

          isOpenable ? "active:scale-[0.94]" : "opacity-50",

          // ============================================================
          // DESKTOP
          // ============================================================
          "sm:h-auto sm:flex-row sm:items-start",
          "sm:justify-start sm:gap-3",
          "sm:overflow-visible sm:rounded-xl",
          "sm:border sm:border-border/50",
          "sm:bg-card/40 sm:p-3.5",
          "sm:text-left sm:transition-colors",

          isOpenable
            ? "sm:active:scale-100 sm:hover:border-border sm:hover:bg-card"
            : "sm:opacity-70",

          "sm:focus-within:border-ring",
          "sm:focus-within:bg-card",
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

              "ring-1 ring-black/[0.04]",
              "shadow-[0_2px_7px_rgba(15,23,42,0.10)]",

              getCategoryTone(app.category),

              !isOpenable && "grayscale opacity-60",

              // Desktop
              "sm:h-10 sm:w-10",
              "sm:rounded-lg",
              "sm:shadow-none",
            )}
          >
            <Icon
              className="
                h-6 w-6
                sm:h-[18px] sm:w-[18px]
              "
              strokeWidth={1.8}
            />
          </span>
        </span>

        {/* ============================================================
            APP NAME
            ============================================================ */}
        <div
          className="
            mt-1.5
            flex
            flex-col
            items-center
            w-full
            min-w-0
            justify-center
            gap-2

            sm:mt-0
            sm:block
            sm:w-auto
            sm:flex-1
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
                max-w-[92px]
                overflow-hidden

                text-[11px]
                font-medium
                leading-[14px]
                tracking-[-0.01em]
                text-foreground

                sm:max-w-full
                sm:truncate
                sm:text-sm
                sm:leading-normal
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
              className="relative z-10 mt-1.5 rounded-md border border-border/70 bg-background px-2 py-1 text-[10px] font-medium text-foreground shadow-sm sm:hidden"
            >
              Request
            </button>
          )}

          {canReportProblem && (
            <button
              type="button"
              onClick={() => onReportProblem?.(app)}
              className="relative z-10 mt-1 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:hidden"
            >
              Report
            </button>
          )}

          {canReportProblem && (
            <button
              type="button"
              onClick={() => onReportProblem?.(app)}
              className="relative z-10 mt-2 hidden text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:block"
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
            // Named per-app, not "_blank": re-launching an app that's
            // already open in another tab reuses that tab instead of
            // stacking a fresh one that replays the whole SSO redirect
            // chain from a blank page every click. Reuse only actually
            // happens through handleLaunchClick below - this target/rel
            // pair is the fallback for modifier/middle clicks, which
            // always open a new tab regardless.
            target={launchWindowName}
            rel="noopener noreferrer"
            onClick={handleLaunchClick}
            className="
              absolute
              inset-0
              rounded-xl
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring

              sm:rounded-xl
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
