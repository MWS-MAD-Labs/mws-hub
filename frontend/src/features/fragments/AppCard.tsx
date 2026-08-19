import { memo } from "react";
import { ArrowUpRight, Lock, Wrench, Clock3, Unlink, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAppIcon, getCategoryTone } from "@/data/hubCategories";
import { env } from "@/config/env";
import type { HubApplication } from "@/model/hub-model";

type BlockedKey = "locked" | "maintenance" | "coming_soon" | "no_link";

type BlockedConfig = {
  icon: LucideIcon;
  text: (app: HubApplication) => string;
};

// A launcher tile, not a dashboard card: icon left, name and one-line purpose
// right, nothing else. No divider, no category footer - the filter row above
// already says which category you are looking at, so repeating it on 19 cards
// is pure noise and costs a third of the card's height.
const BLOCKED: Record<BlockedKey, BlockedConfig> = {
  locked: { icon: Lock, text: (app) => `Available to ${app.audience}` },
  maintenance: { icon: Wrench, text: () => "Temporarily unavailable" },
  coming_soon: { icon: Clock3, text: () => "Not released yet" },
  no_link: { icon: Unlink, text: () => "No link registered yet" },
};

const blockedKeyOf = (app: HubApplication): BlockedKey | null => {
  if (app.access === "locked") return "locked";
  if (app.status === "maintenance") return "maintenance";
  if (app.status === "coming_soon") return "coming_soon";
  if (!app.href) return "no_link";
  return null;
};

type AppCardProps = {
  app: HubApplication;
  onRequestAccess?: (app: HubApplication) => void;
};

const AppCard = memo(({ app, onRequestAccess }: AppCardProps) => {
  const Icon = getAppIcon(app.icon);
  const blockedKey = blockedKeyOf(app);
  const isOpenable = !blockedKey;
  const blocked = blockedKey ? BLOCKED[blockedKey] : null;
  const BlockedIcon = blocked?.icon;

  // SSO-enabled apps route through Hub's own backend first, which mints a
  // short-lived relay token and forwards the browser on - the app's real
  // href never gets touched directly for those.
  const launchHref = app.ssoAppId ? `${env.hubApiBaseUrl}/apps/${app.ssoAppId}/launch` : app.href;

  return (
    <article
      className={cn(
        "group relative flex h-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg p-0 text-center transition duration-200 sm:h-auto sm:flex-row sm:items-start sm:justify-start sm:gap-3 sm:overflow-visible sm:rounded-xl sm:border sm:border-border/50 sm:bg-card/40 sm:p-3.5 sm:text-left sm:transition-colors",
        isOpenable
          ? "active:scale-[0.98] sm:active:scale-100 sm:hover:border-border sm:hover:bg-card sm:focus-within:border-ring sm:focus-within:bg-card"
          : "opacity-70",
      )}
    >
      <span
        className={cn(
          "flex aspect-square h-[clamp(2.5rem,7.2svh,4rem)] w-[clamp(2.5rem,7.2svh,4rem)] shrink-0 items-center justify-center rounded-[16px] shadow-[0_10px_24px_rgba(15,23,42,0.16)] ring-1 sm:h-10 sm:w-10 sm:rounded-lg sm:shadow-none",
          getCategoryTone(app.category),
          !isOpenable && "opacity-60 grayscale",
        )}
      >
        <Icon className="h-[clamp(1.15rem,3.4svh,1.8rem)] w-[clamp(1.15rem,3.4svh,1.8rem)] sm:h-[18px] sm:w-[18px]" />
      </span>

      <div className="min-w-0 sm:flex-1 sm:w-auto">
        <div className="flex min-w-0 items-center justify-center gap-2 sm:justify-start">
          <h3 className="line-clamp-2 min-h-6 max-w-[5.75rem] text-[10px] font-medium leading-3 text-foreground sm:min-h-0 sm:max-w-full sm:truncate sm:text-sm sm:leading-normal">
            {app.name}
          </h3>
          {app.status === "new" && isOpenable && (
            <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
              New
            </span>
          )}
          {isOpenable && app.external && (
            <ArrowUpRight
              className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Clamped to one line when blocked so the extra note below
            keeps every tile in the row the same height. */}
        <p
          className={cn(
            "mt-0.5 hidden text-xs leading-relaxed text-muted-foreground sm:block",
            blocked ? "line-clamp-1" : "line-clamp-2",
          )}
        >
          {app.description}
        </p>

        {blocked && BlockedIcon && (
          <p className="mt-1 hidden items-center gap-1.5 text-[11px] text-muted-foreground/80 sm:flex">
            <BlockedIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{blocked.text(app)}</span>
            {blockedKey === "locked" && (
              <button
                type="button"
                onClick={() => onRequestAccess?.(app)}
                className="relative z-10 ml-auto shrink-0 font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Request
              </button>
            )}
          </p>
        )}
      </div>

      {/* Every catalog entry is an external URL now that the Hub is its own
          app - stretched-link anchor keeps the whole tile clickable while
          staying a real <a> so middle-click / "open in new tab" still work. */}
      {isOpenable && launchHref && (
        <a
          href={launchHref}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-xl"
        >
          <span className="sr-only">{`Open ${app.name} in a new tab`}</span>
        </a>
      )}
    </article>
  );
});

AppCard.displayName = "AppCard";
export default AppCard;
