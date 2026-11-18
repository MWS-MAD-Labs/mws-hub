import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// "See all" link in a card header.
export default function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="admin-focus inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-[var(--admin-brand)] hover:underline">
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}
