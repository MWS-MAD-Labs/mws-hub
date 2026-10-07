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
import { getAppIcon, getCategoryLabel, getCategoryTone } from "@/data/hubCategories";
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
  variant?: "list" | "pinned";
  onRequestAccess?: (app: HubApplication) => void;
  onReportProblem?: (app: HubApplication) => void;
};

const AppCard = memo(
  ({ app, variant = "list", onRequestAccess, onReportProblem }: AppCardProps) => {
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

      // On phones, long-press preview proves the anchor URL itself is fine.
      // The fragile part is the desktop-only reuse/silent-refresh flow below:
      // mobile browsers can leave the named window at about:blank after a
      // prevented click plus async work. Let mobile use the native anchor
      // navigation instead; the backend launch route still redirects expired
      // sessions back to Hub login.
      if (window.matchMedia("(pointer: coarse)").matches) {
        return;
      }

      event.preventDefault();

      // Mobile browsers are strict about popups: if window.open happens
      // after an awaited request, the tap gesture is already gone and the
      // browser may leave users staring at about:blank. Claim/find the
      // target synchronously, then do the session check before navigating it.
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
        if (isFreshWindow) target.close();
        navigate("/login?error=session_expired");
        return;
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

    if (variant === "pinned") {
      return (
        <article className={cn("group relative min-w-[5.25rem] text-center sm:min-w-0 sm:text-left", !isOpenable && "opacity-60")}>
          <span className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-border/60 sm:mx-0 sm:h-14 sm:w-14", getCategoryTone(app.category), !isOpenable && "grayscale")}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
          </span>
          <h3 className="font-heading mt-2 line-clamp-2 text-[10px] font-bold leading-tight text-foreground sm:mt-3 sm:text-xs">{app.name}</h3>
          <p className="mt-1 hidden truncate text-[10px] text-muted-foreground sm:block">{getCategoryLabel(app.category)}</p>
          {isOpenable ? (
            <a href={launchHref} target={launchWindowName} rel="noopener noreferrer" onClick={handleLaunchClick} className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="sr-only">{`Open ${app.name} in a new tab`}</span>
            </a>
          ) : canRequestAccess ? (
            <button type="button" onClick={() => onRequestAccess?.(app)} className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="sr-only">{`Request access to ${app.name}`}</span></button>
          ) : null}
        </article>
      );
    }

    return (
      <article className={cn("group relative flex min-w-0 items-center gap-3 border-b border-border py-3.5 transition-colors hover:bg-card/50 sm:px-1", !isOpenable && "opacity-65")}>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60", getCategoryTone(app.category), !isOpenable && "grayscale")}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="font-heading truncate text-sm font-bold text-foreground">{app.name}</h3>
            {app.status === "new" && isOpenable ? <span className="shrink-0 text-[9px] font-bold text-primary">New</span> : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{app.description}</p>
          {blocked && BlockedIcon ? (
            <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <BlockedIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{blocked.text(app)}</span>
            </p>
          ) : null}
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-2">
          {canRequestAccess ? <button type="button" onClick={() => onRequestAccess?.(app)} className="rounded-full border border-border px-3 py-1.5 text-[10px] font-bold text-foreground hover:bg-muted">Request</button> : null}
          {canReportProblem ? <button type="button" onClick={() => onReportProblem?.(app)} className="hidden text-[10px] font-semibold text-muted-foreground hover:text-foreground sm:block">Report</button> : null}
          {isOpenable ? <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" /> : null}
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
              rounded-lg
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
