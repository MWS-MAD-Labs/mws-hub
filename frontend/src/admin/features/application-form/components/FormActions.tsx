import { primaryButtonClass, secondaryButtonClass } from "../constants";

type FormActionsProps = {
  isSaving: boolean;
  isEditing: boolean;
  onCancel: () => void;
};

export default function FormActions({ isSaving, isEditing, onCancel }: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className={secondaryButtonClass}
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className={primaryButtonClass}
      >
        {isSaving ? "Menyimpan..." : isEditing ? "Simpan perubahan" : "Tambah aplikasi"}
      </button>
    </div>
  );
}
