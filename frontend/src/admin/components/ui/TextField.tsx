import { forwardRef, useId, type InputHTMLAttributes } from "react";
import FieldLabel from "./FieldLabel";
import { cn } from "@/lib/utils";
import { fieldClass } from "./styles";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  // Tone of the hint: plain, or a warning the person should read.
  hintTone?: "muted" | "warning";
  wrapperClassName?: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, hintTone = "muted", id, className, wrapperClassName, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const note = error || hint;
  return (
    <div className={cn("flex w-full flex-col", wrapperClassName)}>
      {label ? <FieldLabel htmlFor={inputId}>{label}</FieldLabel> : null}
      <input ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={note ? noteId : undefined} className={cn(fieldClass, error && "border-[var(--admin-rose)]", className)} {...props} />
      {note ? (
        <p id={noteId} className={cn("mt-1 text-xs", error ? "text-[var(--admin-rose)]" : hintTone === "warning" ? "text-[var(--admin-gold-text)]" : "text-[var(--admin-text-tertiary)]")}>{note}</p>
      ) : null}
    </div>
  );
});

export default TextField;
