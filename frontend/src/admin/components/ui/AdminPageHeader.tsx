import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export default function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-[var(--admin-border-strong)] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="admin-heading text-xs font-bold text-[var(--admin-brand)]">{eyebrow}</p>
        <h1 className="admin-heading mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--admin-text)] sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--admin-text-secondary)]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
