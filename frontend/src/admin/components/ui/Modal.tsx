import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { getOverlayRoot } from "@/components/overlays/portal";
import { cn } from "@/lib/utils";
import PanelHeader from "./PanelHeader";
import { preventCloseFromDropdownMenu } from "./overlay";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
};

const WIDTH = { sm: "w-[min(92vw,28rem)]", md: "w-[min(92vw,36rem)]", lg: "w-[min(94vw,52rem)]" };

// A centred dialog. Non-modal with its own overlay so the admin Dropdown's
// portalled menu stays usable inside it; it sits on the drawer layers, below
// that menu.
export default function Modal({ open, onOpenChange, title, description, size = "md", footer, children }: ModalProps) {
  return (
    <Dialog.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={getOverlayRoot() ?? undefined}>
        <div aria-hidden className="fixed inset-0 z-[var(--layer-drawer-backdrop)] bg-black/35" />
        <Dialog.Content
          aria-describedby={undefined}
          onInteractOutside={preventCloseFromDropdownMenu}
          className={cn("admin-theme fixed left-1/2 top-1/2 z-[var(--layer-drawer)] flex max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)] shadow-xl outline-none", WIDTH[size])}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <PanelHeader title={title} onClose={() => onOpenChange(false)} />
          <div className="min-h-0 overflow-y-auto p-5">
            {description ? <Dialog.Description className="mb-3 text-sm leading-6 text-[var(--admin-text-secondary)]">{description}</Dialog.Description> : null}
            {children}
          </div>
          {footer ? <footer className="flex justify-end gap-2 border-t border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-5 py-3">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
