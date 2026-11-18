import type { ReactNode } from "react";

export default function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex min-w-0 max-w-[11rem] items-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--admin-text)]">
      <span className="truncate">{children}</span>
    </span>
  );
}
