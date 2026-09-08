import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

type DropdownProps<T extends string = string> = {
  value?: T;
  options?: readonly DropdownOption<T>[];
  onChange?: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  label?: string;
  children?: ReactNode;
};

export default function Dropdown<T extends string = string>({
  value,
  options = [],
  onChange,
  placeholder = "Select",
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  label,
  children,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const buttonLabel = selectedOption?.label ?? label ?? placeholder;

const updateMenuPosition = useCallback(() => {
  const button = buttonRef.current;
  if (!button) return;

  const gap = 8;
  const viewportPadding = 8;
  const buttonRect = button.getBoundingClientRect();

  const menuWidth = buttonRect.width;
  const menuHeight = menuRef.current?.offsetHeight ?? 0;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = buttonRect.left;

  // Keep dropdown inside viewport
  if (left + menuWidth > viewportWidth - viewportPadding) {
    left = viewportWidth - menuWidth - viewportPadding;
  }

  left = Math.max(left, viewportPadding);

  let top = buttonRect.bottom + gap;

  // Open upward if there isn't enough space below
  if (
    menuHeight > 0 &&
    top + menuHeight > viewportHeight - viewportPadding &&
    buttonRect.top - menuHeight - gap >= viewportPadding
  ) {
    top = buttonRect.top - menuHeight - gap;
  }

  setMenuStyle({
    position: "fixed",
    left,
    top,
    width: buttonRect.width,
  });
}, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    const frame = window.requestAnimationFrame(updateMenuPosition);

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    function handleViewportChange() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updateMenuPosition]);

  const menu =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className={cn(
              "fixed z-50 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg",
              menuClassName,
            )}
            style={menuStyle}
            role="listbox"
          >
            {children ??
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange?.(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50",
                    option.value === value &&
                      "bg-slate-50 font-medium text-slate-900",
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.value === value ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                </button>
              ))}
          </div>,
          document.body,
        )
      : null;

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName,
        )}
      >
        <span className="min-w-0 truncate">{buttonLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition", isOpen && "rotate-180")}
        />
      </button>

      {menu}
    </div>
  );
}
