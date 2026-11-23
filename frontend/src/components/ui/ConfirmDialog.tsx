import type { ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import { getOverlayRoot } from "@/components/overlays/portal";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working...",
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const portalRoot = getOverlayRoot();

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <AlertDialog.Portal container={portalRoot ?? undefined}>
        <div className="fixed inset-0 z-[var(--layer-modal)]">
          <AlertDialog.Overlay className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center overflow-y-auto p-4 [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)] sm:items-center sm:[padding-top:calc(env(safe-area-inset-top)+1rem)]">
            <AlertDialog.Content
              aria-busy={pending}
              className="pointer-events-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:max-w-md sm:zoom-in-95 sm:slide-in-from-bottom-0"
            >
              <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialog.Cancel
                  disabled={pending}
                  className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {cancelLabel}
                </AlertDialog.Cancel>
                <AlertDialog.Action
                  disabled={pending}
                  onClick={(event) => { event.preventDefault(); onConfirm(); }}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    destructive
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {pending && <LoaderCircle className="size-4 animate-spin" />}
                  {pending ? pendingLabel : confirmLabel}
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </div>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
