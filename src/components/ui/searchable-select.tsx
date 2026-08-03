"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

// A single-select dropdown with a built-in search box — for long lists (people,
// platforms, accounts…). Keyboard + click, closes on outside click/Escape.
export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  className = "",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? options.filter((o) => o.label.toLowerCase().includes(n)) : options;
  }, [q, options]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const base = "rounded-[8px] border border-line bg-card px-2 py-1.5 text-[12px] text-ink outline-none focus:border-teal";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className={`flex w-full items-center justify-between gap-1 ${base} ${selected ? "" : "text-slate"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className="shrink-0 text-[9px] text-slate">▾</span>
      </button>
      {open && (
        <div className="absolute z-[70] mt-1 max-h-64 w-full min-w-[180px] overflow-hidden rounded-[10px] border border-line bg-card shadow-lift">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-line bg-transparent px-3 py-2 text-[12px] text-ink outline-none"
          />
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-slate">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-[12.5px] hover:bg-wash/[0.06] ${o.value === value ? "font-semibold text-teal-dark" : "text-ink"}`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
