import { Popover } from "radix-ui";
import { getOverlayRoot } from "@/components/overlays/portal";
import { cn } from "@/lib/utils";

// Whether Apps Script and Central answered, as a dot; details on click.
export default function ConnectionStatus({ connected, accountCount }: { connected: boolean; accountCount: number }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="admin-focus inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold hover:bg-[var(--admin-card-subtle)]">
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-[var(--admin-sage)]" : "bg-[var(--admin-gold)]")} />
        <span className={connected ? "text-[var(--admin-sage-text)]" : "text-[var(--admin-gold-text)]"}>{connected ? "Connected" : "Central unavailable"}</span>
      </Popover.Trigger>
      <Popover.Portal container={getOverlayRoot() ?? undefined}>
        <Popover.Content align="end" sideOffset={6} className="admin-theme z-[var(--layer-popover)] w-72 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 text-[var(--admin-text)] shadow-lg">
          <p className="text-sm font-semibold">{connected ? "Apps Script and Central are connected" : "Central is unavailable"}</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--admin-text-secondary)]">{connected ? `${accountCount} GPT accounts available. Changes take effect on the next code request.` : "Existing mappings remain active, but changes cannot be saved until Central responds."}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
