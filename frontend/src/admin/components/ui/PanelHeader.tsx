import { X } from "lucide-react";
import type { ReactNode } from "react";
import Button from "./Button";

// Header of a modal, sheet or side panel: title, optional subtitle, close.
export default function PanelHeader({ title, subtitle, onClose, closeLabel = "Close", closeDisabled }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; closeLabel?: string; closeDisabled?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-[var(--admin-text)]">{title}</h2>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-[var(--admin-text-tertiary)]">{subtitle}</p> : null}
      </div>
      <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label={closeLabel} disabled={closeDisabled}>
        <X className="h-4 w-4" />
      </Button>
    </header>
  );
}
