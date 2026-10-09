import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { createPortal } from "react-dom";
import AdminFieldLabel from "@/admin/components/ui/AdminFieldLabel";
import { getOverlayRoot } from "@/components/overlays/portal";
import type { IconComponent, IconEntry } from "../types";

type IconPickerProps = {
  value?: string;
  query: string;
  setQuery: (value: string) => void;
  icons: IconEntry[];
  onChange: (icon: string) => void;
  PreviewIcon: IconComponent;
};

export default function IconPicker({
  value,
  query,
  setQuery,
  icons,
  onChange,
  PreviewIcon,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  function updatePosition() {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    setPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }

  function handleOpen() {
    updatePosition();
    setOpen((current) => !current);
  }

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleScroll() {
      updatePosition();
    }

    function handleResize() {
      updatePosition();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div>
      <AdminFieldLabel>Icon</AdminFieldLabel>

      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        className="admin-focus mt-1.5 flex h-[42px] w-full items-center justify-between rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] px-3 text-sm transition-colors hover:bg-[var(--admin-card-subtle)]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-card-subtle)] text-[var(--admin-brand)]">
            <PreviewIcon className="h-4 w-4" />
          </span>

          <span className="truncate text-[var(--admin-text)]">
            {value || "Select icon"}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--admin-text-tertiary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && getOverlayRoot() ? createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Application icons"
          className="admin-theme fixed z-[var(--layer-popover)] rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] p-2 shadow-xl"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-tertiary)]" />

            <input
              autoFocus
              className="admin-focus h-9 w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-card)] pl-9 pr-3 text-sm"
              placeholder="Search icons"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto">
            {icons.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {icons.map(([icon, Icon]) => {
                  const selected = value === icon;

                  return (
                    <button
                      key={icon}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(icon);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]"
                          : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-card-subtle)] hover:text-[var(--admin-text)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />

                      <span className="truncate">{icon}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-[var(--admin-text-tertiary)]">
                No matching icons.
              </p>
            )}
          </div>
        </div>,
        getOverlayRoot()!,
      ) : null}
    </div>
  );
}
