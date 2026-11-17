import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// A real table in the admin style: small uppercase headers, divided rows.
export function Table({ caption, className, minWidth, children }: { caption?: string; className?: string; minWidth?: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)} style={minWidth ? { minWidth } : undefined}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-card-subtle)]">{children}</tr>
    </thead>
  );
}

export function TH({ className, align, children, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <th scope="col" className={cn("px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-text-tertiary)]", align === "right" && "text-right", className)} {...props}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-[var(--admin-border)]">{children}</tbody>;
}

export function TR({ selected, muted, className, children, ...props }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean; muted?: boolean }) {
  return (
    <tr className={cn("transition-colors motion-reduce:transition-none", selected ? "bg-[var(--admin-brand-soft)]" : "hover:bg-[var(--admin-card-subtle)]", muted && "opacity-70", className)} {...props}>
      {children}
    </tr>
  );
}

export function TD({ className, align, children, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <td className={cn("px-5 py-3.5 align-middle text-[var(--admin-text-secondary)]", align === "right" && "text-right", className)} {...props}>
      {children}
    </td>
  );
}
