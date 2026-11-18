import type { ReactNode } from "react";
import Button from "./Button";

// What a card shows instead of its content while loading, when empty, or on failure.

export function LoadingState({ children = "Loading..." }: { children?: ReactNode }) {
  return (
    <p className="p-10 text-center text-sm text-[var(--admin-text-tertiary)]" aria-busy>
      {children}
    </p>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-1 p-10 text-center">
      <p className="font-medium text-[var(--admin-text)]">{title}</p>
      {children ? <p className="text-sm text-[var(--admin-text-tertiary)]">{children}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: { title: ReactNode; message?: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="grid justify-items-center gap-1 p-10 text-center">
      <p className="font-medium text-[var(--admin-text)]">{title}</p>
      {message ? <p className="text-sm text-[var(--admin-text-tertiary)]">{message}</p> : null}
      {onRetry ? (
        <Button size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
