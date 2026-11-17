import type { ReactNode } from "react";

// The top of every admin page: title, one line of description, page actions.
export default function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[var(--admin-text-tertiary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
