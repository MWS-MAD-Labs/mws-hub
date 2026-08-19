import { memo } from "react";
import { SearchX, PackageOpen, CloudOff } from "lucide-react";

// Three genuinely different situations, deliberately not collapsed into one
// message: "no match" is something the user can undo, "no apps at all" is a
// provisioning problem, and "failed to load" is our fault and retryable.
const VARIANTS = {
    "no-results": {
        icon: SearchX,
        title: "No applications found",
        action: "Clear filters",
    },
    "no-apps": {
        icon: PackageOpen,
        title: "No applications assigned yet",
        body: "Your account has no applications assigned. This is usually a configuration issue — contact an administrator so they can grant your access.",
        action: "Contact administrator",
    },
    error: {
        icon: CloudOff,
        title: "Couldn't load the catalog",
        body: "The application catalog failed to load. This is on our side, not yours — try again in a moment.",
        action: "Try again",
    },
};

const HubEmptyState = memo(({ variant, query, onAction, supportEmail }) => {
    const config = VARIANTS[variant] || VARIANTS["no-results"];
    const Icon = config.icon;
    const isNoApps = variant === "no-apps";

    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Icon className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-base font-semibold text-foreground">{config.title}</h3>

            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {config.body || (
                    <>
                        Nothing matches
                        {query ? <span className="font-medium text-foreground"> “{query}”</span> : " the current filter"}.
                        Try a different keyword or clear the filters.
                    </>
                )}
            </p>

            {isNoApps ? (
                <a
                    href={`mailto:${supportEmail}`}
                    className="mt-5 rounded-lg border border-border/60 bg-card/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {config.action}
                </a>
            ) : (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 rounded-lg border border-border/60 bg-card/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {config.action}
                </button>
            )}
        </div>
    );
});

HubEmptyState.displayName = "HubEmptyState";
export default HubEmptyState;
