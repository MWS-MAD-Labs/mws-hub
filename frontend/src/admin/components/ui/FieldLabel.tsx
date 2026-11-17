import type { ReactNode } from "react";

// The small label above a field in a toolbar or form.
export default function FieldLabel({ children, htmlFor, optional = false }: { children: ReactNode; htmlFor?: string; optional?: boolean }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <Tag htmlFor={htmlFor} className="mb-1 flex items-baseline gap-1.5 text-xs font-semibold text-[var(--admin-text-secondary)]">
      {children}
      {optional ? <span className="font-normal text-[var(--admin-text-tertiary)]">Optional</span> : null}
    </Tag>
  );
}
