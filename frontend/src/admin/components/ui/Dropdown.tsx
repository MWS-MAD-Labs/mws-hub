import { Check, ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { getOverlayRoot } from "@/components/overlays/portal";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: React.ReactNode;
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
  ariaLabel?: string;
  size?: "sm" | "md";
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
  align = "left",
  label,
  ariaLabel,
  size = "md",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const selectedOption = options.find((option) => option.value === value);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value && !option.disabled));
  const buttonLabel = selectedOption?.label ?? label ?? placeholder;

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const gap = 8;
    const viewportPadding = 8;
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = Math.max(buttonRect.width, menuRef.current?.offsetWidth ?? 0);
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    let left = align === "right" ? buttonRect.right - menuWidth : buttonRect.left;
    left = Math.min(Math.max(left, viewportPadding), window.innerWidth - menuWidth - viewportPadding);
    let top = buttonRect.bottom + gap;
    if (menuHeight > 0 && top + menuHeight > window.innerHeight - viewportPadding && buttonRect.top - menuHeight - gap >= viewportPadding) {
      top = buttonRect.top - menuHeight - gap;
    }
    setMenuStyle({ position: "fixed", left, top, minWidth: buttonRect.width });
  }, [align]);

  const close = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const selectOption = useCallback((option: DropdownOption<T>) => {
    if (option.disabled) return;
    onChange?.(option.value);
    close();
  }, [close, onChange]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setActiveIndex(selectedIndex);
    updateMenuPosition();
    const frame = window.requestAnimationFrame(() => {
      updateMenuPosition();
      optionRefs.current[selectedIndex]?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, selectedIndex, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close(false);
    };
    const handleViewportChange = () => updateMenuPosition();
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [close, isOpen, updateMenuPosition]);

  useEffect(() => { if (disabled) setIsOpen(false); }, [disabled]);

  const moveActive = (direction: 1 | -1) => {
    if (!options.length) return;
    let next = activeIndex;
    do { next = (next + direction + options.length) % options.length; } while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); moveActive(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveActive(-1); }
    else if (event.key === "Home") { event.preventDefault(); const next = options.findIndex((option) => !option.disabled); setActiveIndex(next); optionRefs.current[next]?.focus(); }
    else if (event.key === "End") { event.preventDefault(); let next = options.length - 1; while (next > 0 && options[next]?.disabled) next -= 1; setActiveIndex(next); optionRefs.current[next]?.focus(); }
    else if (event.key === "Escape") { event.preventDefault(); close(); }
  };

  const portalHost = getOverlayRoot();
  const menu = isOpen && portalHost ? createPortal(
    <div ref={menuRef} id={menuId} role="listbox" aria-label={ariaLabel || placeholder} onKeyDown={handleMenuKeyDown} className={cn("admin-theme fixed z-[var(--layer-popover)] max-h-64 overflow-y-auto rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] p-1 shadow-xl", menuClassName)} style={menuStyle}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(node) => { optionRefs.current[index] = node; }}
          type="button"
          disabled={option.disabled}
          role="option"
          aria-selected={option.value === value}
          tabIndex={index === activeIndex ? 0 : -1}
          onFocus={() => setActiveIndex(index)}
          onClick={() => selectOption(option)}
          className={cn("admin-focus flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--admin-text-secondary)] transition hover:bg-[var(--admin-card-subtle)] hover:text-[var(--admin-text)] disabled:cursor-not-allowed disabled:opacity-50", option.value === value && "bg-[var(--admin-brand-soft)] font-semibold text-[var(--admin-brand)]")}
        >
          <span className="min-w-0 truncate">{option.label}</span>
          {option.value === value ? <Check className="h-4 w-4 shrink-0" /> : null}
        </button>
      ))}
    </div>,
    portalHost,
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button ref={buttonRef} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-controls={menuId} aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} onKeyDown={(event) => { if (!isOpen && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); setIsOpen(true); } }} className={cn("admin-focus inline-flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-3 font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-card-subtle)] disabled:cursor-not-allowed disabled:opacity-60", size === "sm" ? "h-8 text-xs" : "h-10 text-sm", buttonClassName)}>
        <span className="min-w-0 truncate">{buttonLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--admin-text-tertiary)] transition", isOpen && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}
