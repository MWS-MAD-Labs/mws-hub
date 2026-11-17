import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { getOverlayRoot } from "@/components/overlays/portal";
import { preventCloseFromDropdownMenu } from "./overlay";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Accessible name; the content draws its own visible header.
  label: string;
  children: ReactNode;
};

// A panel sliding in from the right. Focus moves to it on open; the caller
// returns focus where it belongs on close.
export default function Sheet({ open, onOpenChange, label, children }: SheetProps) {
  return (
    <Dialog.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={getOverlayRoot() ?? undefined}>
        <div aria-hidden className="fixed inset-0 z-[var(--layer-drawer-backdrop)] bg-black/35" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement | null)?.focus(); }}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={preventCloseFromDropdownMenu}
          className="admin-theme fixed inset-y-0 right-0 z-[var(--layer-drawer)] w-[min(420px,100vw)] border-l border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)] shadow-xl outline-none"
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
