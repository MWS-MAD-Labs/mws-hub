type FormActionsProps = {
  isSaving: boolean;
  isEditing: boolean;
  onCancel: () => void;
};

export default function FormActions({ isSaving, isEditing, onCancel }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-border/70 px-4 py-2 text-sm font-semibold hover:bg-muted"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {isSaving ? "Menyimpan..." : isEditing ? "Simpan perubahan" : "Tambah aplikasi"}
      </button>
    </div>
  );
}
