import type { ReactNode } from "react";

type AdminFieldLabelProps = {
  children: ReactNode;
  optional?: boolean;
};

export default function AdminFieldLabel({ children, optional = false }: AdminFieldLabelProps) {
  return (
    <span className="admin-heading flex min-h-5 items-baseline gap-1.5 text-sm font-bold text-[var(--admin-text)]">
      <span>{children}</span>
      {optional ? <span className="font-normal text-[11px] text-[var(--admin-text-tertiary)]">Optional</span> : null}
    </span>
  );
}
