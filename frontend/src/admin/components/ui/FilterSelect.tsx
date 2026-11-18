import type { DropdownOption } from "./Dropdown";
import Dropdown from "./Dropdown";
import FieldLabel from "./FieldLabel";
import { cn } from "@/lib/utils";

type FilterSelectProps<T extends string> = {
  value?: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  // Shown above the select; also its accessible name.
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: "left" | "right";
  className?: string;
};

// The admin Dropdown at the kit's height and radius, with an optional label.
export default function FilterSelect<T extends string>({ value, options, onChange, label, ariaLabel, placeholder, disabled, align, className }: FilterSelectProps<T>) {
  return (
    <div className={cn("flex w-full flex-col sm:w-44", className)}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Dropdown value={value} options={options} onChange={onChange} ariaLabel={ariaLabel ?? label} placeholder={placeholder} disabled={disabled} align={align} buttonClassName="h-9 rounded-md font-medium" />
    </div>
  );
}
