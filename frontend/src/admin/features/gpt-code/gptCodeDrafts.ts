import type {
  AdminGptCodeConfiguration,
  AdminGptCodeMapping,
  AdminGptCodeTarget,
  AdminGptCodeTargetKind,
} from "@/admin/api/adminApi";

export const KINDS: { value: AdminGptCodeTargetKind; label: string }[] = [
  { value: "unit", label: "Unit" },
  { value: "job_level", label: "Job level" },
  { value: "job_position", label: "Job position" },
  { value: "building", label: "Building" },
];

export const KIND_LABEL = Object.fromEntries(KINDS.map((kind) => [kind.value, kind.label])) as Record<
  AdminGptCodeTargetKind,
  string
>;

// One card's rules as edited, before Save.
export type Draft = {
  targets: AdminGptCodeTarget[];
  isActive: boolean;
  addKind: AdminGptCodeTargetKind;
  addId: string;
};

export const keyOf = (target: { type: string; id: string }) => `${target.type}:${target.id}`;

export function draftFrom(mapping: AdminGptCodeMapping | undefined): Draft {
  return { targets: mapping?.targets ?? [], isActive: mapping?.isActive ?? true, addKind: "unit", addId: "" };
}

export function draftsFrom(configuration: AdminGptCodeConfiguration): Record<string, Draft> {
  return Object.fromEntries(
    configuration.accounts.map((account) => [
      account.cardId,
      draftFrom(configuration.mappings.find((item) => item.cardId === account.cardId)),
    ]),
  );
}

// Unsaved changes on one card: each rule added or removed, plus the active switch.
export function changesOf(draft: Draft | undefined, mapping: AdminGptCodeMapping | undefined): number {
  if (!draft) return 0;
  const saved = mapping?.targets ?? [];
  const savedKeys = new Set(saved.map(keyOf));
  const draftKeys = new Set(draft.targets.map(keyOf));
  const added = draft.targets.filter((target) => !savedKeys.has(keyOf(target))).length;
  const removed = saved.filter((target) => !draftKeys.has(keyOf(target))).length;
  return added + removed + (draft.isActive !== (mapping?.isActive ?? true) ? 1 : 0);
}
