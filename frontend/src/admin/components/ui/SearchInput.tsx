import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  // Read by screen readers; the placeholder is used when it is left out.
  label?: string;
};

export default function SearchInput({ value, onChange, label, placeholder, className, ...props }: SearchInputProps) {
  return (
    <label className={cn("relative block w-full sm:w-64", className)}>
      <span className="sr-only">{label ?? placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-tertiary)]" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="admin-focus h-9 w-full rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-card)] pl-9 pr-3 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-tertiary)]"
        {...props}
      />
    </label>
  );
}
