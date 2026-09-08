import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
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

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">Ikon</label>

      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="mt-2 flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-primary">
            <PreviewIcon className="h-4 w-4" />
          </span>

          <span className="truncate text-slate-700">
            {value || "Pilih ikon"}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-md border border-slate-200 bg-white p-2 shadow-lg"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              autoFocus
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Cari ikon..."
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
                      onClick={() => {
                        onChange(icon);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "bg-primary/10 text-primary"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />

                      <span className="truncate">{icon}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-slate-500">
                Tidak ada ikon yang cocok.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}