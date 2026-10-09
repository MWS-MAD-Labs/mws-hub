import { primaryButtonClass, secondaryButtonClass } from "../constants";

type FormActionsProps = {
  isSaving: boolean;
  isEditing: boolean;
  onCancel: () => void;
};

export default function FormActions({ isSaving, isEditing, onCancel }: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[var(--admin-border)] pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
      onClick={onCancel}
        disabled={isSaving}
        className={secondaryButtonClass}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className={primaryButtonClass}
      >
        {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Application"}
      </button>
    </div>
  );
}
