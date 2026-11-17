import { useId, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./styles";

export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
  // Extra text matched by the search but not shown.
  keywords?: string;
};

type AutocompleteProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onSelect"> & {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  // Called with the option picked from the list; the input then holds its value.
  onSelect?: (option: AutocompleteOption) => void;
  hint?: string;
  hintTone?: "muted" | "warning";
  maxResults?: number;
  emptyText?: string;
};

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// A text input that suggests matches as you type. Free text is still allowed;
// the list only helps. Arrow keys move, Enter picks, Escape closes.
export default function Autocomplete({ value, onChange, options, onSelect, hint, hintTone = "muted", maxResults = 8, emptyText, className, disabled, ...props }: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const hintId = useId();
  const blurTimer = useRef<number | undefined>(undefined);

  const matches = useMemo(() => {
    const words = normalize(value.trim()).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return options
      .filter((option) => {
        const haystack = normalize(`${option.label} ${option.value} ${option.description ?? ""} ${option.keywords ?? ""}`);
        return words.every((word) => haystack.includes(word));
      })
      .slice(0, maxResults);
  }, [options, value, maxResults]);

  const exact = matches.length === 1 && matches[0].value.toLowerCase() === value.trim().toLowerCase();
  const showList = open && !disabled && value.trim().length > 0 && !exact && (matches.length > 0 || Boolean(emptyText));
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

  function pick(option: AutocompleteOption) {
    onChange(option.value);
    onSelect?.(option);
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && matches.length > 0 ? `${listId}-${activeIndex}` : undefined}
        aria-describedby={hint ? hintId : undefined}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 120); }}
        onKeyDown={(event) => {
          if (!showList) {
            if (event.key === "ArrowDown" && value.trim()) { setOpen(true); event.preventDefault(); }
            return;
          }
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((activeIndex + 1) % Math.max(matches.length, 1)); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActive((activeIndex - 1 + matches.length) % Math.max(matches.length, 1)); }
          else if (event.key === "Enter" && matches[activeIndex]) { event.preventDefault(); pick(matches[activeIndex]); }
          // Marked as handled so a surrounding panel does not also close on it.
          else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
        }}
        className={cn(fieldClass, className)}
        {...props}
      />
      {showList ? (
        <ul id={listId} role="listbox" className="admin-theme absolute left-0 right-0 top-full z-[var(--layer-popover)] mt-1 max-h-64 overflow-y-auto rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-card)] p-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--admin-text-tertiary)]">{emptyText}</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => { event.preventDefault(); window.clearTimeout(blurTimer.current); pick(option); }}
                onMouseEnter={() => setActive(index)}
                className={cn("cursor-pointer rounded-sm px-3 py-2", index === activeIndex && "bg-[var(--admin-brand-soft)]")}
              >
                <p className="truncate text-sm font-medium text-[var(--admin-text)]">{option.label}</p>
                {option.description ? <p className="truncate text-xs text-[var(--admin-text-tertiary)]">{option.description}</p> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
      {hint ? <p id={hintId} className={cn("mt-1 text-xs", hintTone === "warning" ? "text-[var(--admin-gold-text)]" : "text-[var(--admin-text-tertiary)]")}>{hint}</p> : null}
    </div>
  );
}
