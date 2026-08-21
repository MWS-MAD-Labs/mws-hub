import { memo } from "react";
import {
  ArrowUpRight,
  Lock,
  Wrench,
  Clock3,
  Unlink,
  type LucideIcon,
} from "lucide-react";
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

  // Every app routes through Hub's backend first. SSO apps get a short-lived
  // relay token; plain links are rechecked against Central before redirect.
  const launchId = app.ssoAppId || app.id;
  const launchHref = `${env.hubApiBaseUrl}/apps/${encodeURIComponent(launchId)}/launch`;

  return (
    <article
      className={cn(
        "group relative flex min-w-0 w-full",
        "flex-col items-center justify-center",
        "gap-1 overflow-hidden",
        "rounded-2xl px-1 py-2",
        "text-center",
        "transition-transform duration-150",

        isOpenable ? "active:scale-[0.94]" : "opacity-50",

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
      <span
        className={cn(
          "flex h-11 w-11 shrink-0",
          "items-center justify-center",
          "rounded-[14px]",
          "ring-1 ring-black/[0.04]",
          "shadow-[0_5px_16px_rgba(15,23,42,0.10)]",
          getCategoryTone(app.category),
          !isOpenable && "grayscale opacity-60",
          "sm:h-10 sm:w-10",
          "sm:rounded-lg sm:shadow-none",
        )}
      >
        <Icon
          className="
      h-[21px] w-[21px]
      sm:h-[18px] sm:w-[18px]
    "
        />
      </span>

      <div className="min-w-0 w-full flex justify-center sm:block sm:flex-1">
        <div className="flex min-w-0 items-center justify-center gap-1">
          <h3
            className="
        line-clamp-2
        max-w-[78px]
        text-[10px]
        font-medium
        leading-[1.15]
        tracking-[-0.01em]
        text-foreground
        sm:max-w-full
        sm:truncate
        sm:text-sm
        sm:leading-normal
      "
          >
            {app.name}
          </h3>

          {app.status === "new" && isOpenable && (
            <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline">
              New
            </span>
          )}

          {isOpenable && app.external && (
            <ArrowUpRight
              className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block"
              aria-hidden="true"
            />
          )}
        </div>

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
