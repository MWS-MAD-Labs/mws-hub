import type { AdminGptCodeTarget } from "@/admin/api/adminApi";
import Badge from "@/admin/components/ui/Badge";
import Chip from "@/admin/components/ui/Chip";
import { KIND_LABEL, keyOf } from "../gptCodeDrafts";

// A card's rules as chips: three at most, then "+N".
export default function OfferedTo({ targets, active, mapped, unsaved }: { targets: AdminGptCodeTarget[]; active: boolean; mapped: boolean; unsaved: boolean }) {
  const shown = targets.slice(0, 3);
  const more = targets.length - shown.length;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {!active && mapped ? (
        <span className="text-sm text-[var(--admin-text-tertiary)]">Inactive</span>
      ) : targets.length === 0 ? (
        <span className="text-sm text-[var(--admin-text-tertiary)]">Not offered yet</span>
      ) : (
        <>
          {shown.map((target) => (
            <Chip key={keyOf(target)} title={`${KIND_LABEL[target.type]}: ${target.name}`}>{target.name}</Chip>
          ))}
          {more > 0 ? <Chip title={targets.slice(3).map((target) => target.name).join(", ")}>+{more}</Chip> : null}
        </>
      )}
      {unsaved ? <Badge tone="warning">Unsaved</Badge> : null}
    </div>
  );
}
