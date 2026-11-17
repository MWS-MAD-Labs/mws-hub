import { cn } from "@/lib/utils";

export default function StatTile({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--admin-border)] p-4">
      <p className="text-xs text-[var(--admin-text-tertiary)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", attention ? "text-[var(--admin-gold-text)]" : "text-[var(--admin-text)]")}>{value}</p>
    </div>
  );
}
