import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./styles";
import { getOverlayRoot } from "@/components/overlays/portal";

type AdminConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
};

export default function AdminConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = "Cancel", destructive = false, pending = false, onConfirm, children }: AdminConfirmDialogProps) {
  const portalRoot = getOverlayRoot();
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <AlertDialog.Portal container={portalRoot ?? undefined}>
        <div className="fixed inset-0 z-[var(--layer-modal)]">
          <AlertDialog.Overlay className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-y-auto p-4 [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)] [padding-top:calc(env(safe-area-inset-top)+1rem)]">
            <AlertDialog.Content aria-busy={pending} className="admin-theme pointer-events-auto my-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,30rem)] overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-xl">
              <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--admin-text-secondary)]">{description}</AlertDialog.Description>
              {children ? <div className="mt-4">{children}</div> : null}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialog.Cancel disabled={pending} className={buttonClass({ variant: "outline" })}>{cancelLabel}</AlertDialog.Cancel>
                <AlertDialog.Action disabled={pending} onClick={(event) => { event.preventDefault(); onConfirm(); }} className={cn(buttonClass({ variant: "primary" }), destructive && "bg-[var(--admin-rose)] dark:text-[#241718]")}>{pending ? "Working..." : confirmLabel}</AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </div>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
