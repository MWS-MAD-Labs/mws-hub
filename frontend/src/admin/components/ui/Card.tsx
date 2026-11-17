import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  title?: ReactNode;
  // Under the title: a count ("12 records") or a sentence.
  description?: ReactNode;
  // Right side of the header: buttons, a status, a link.
  actions?: ReactNode;
  // A band under the header for search and filters.
  toolbar?: ReactNode;
  footer?: ReactNode;
  // Pads the body; leave off for a table that runs edge to edge.
  padded?: boolean;
  busy?: boolean;
  className?: string;
  children?: ReactNode;
};

// The one card frame of the admin: header, optional toolbar, body, optional footer.
export default function Card({ title, description, actions, toolbar, footer, padded = false, busy, className, children }: CardProps) {
  return (
    <section aria-busy={busy || undefined} className={cn("overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm", className)}>
      {title || description || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="font-semibold text-[var(--admin-text)]">{title}</h2> : null}
            {description ? <div className="mt-0.5 text-sm text-[var(--admin-text-tertiary)]">{description}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {toolbar ? <div className="flex flex-col gap-2 border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-5 py-3 sm:flex-row sm:flex-wrap sm:items-end">{toolbar}</div> : null}
      <div className={padded ? "p-5" : undefined}>{children}</div>
      {footer ? <footer className="border-t border-[var(--admin-border)] bg-[var(--admin-card-subtle)] px-5 py-3 text-sm text-[var(--admin-text-tertiary)]">{footer}</footer> : null}
    </section>
  );
}
