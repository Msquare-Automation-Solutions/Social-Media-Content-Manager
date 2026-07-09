"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ActivityRow } from "@/lib/data";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-format";
import { initials } from "@/lib/colors";

const CATEGORY_STYLES: Record<string, string> = {
  content: "bg-teal-soft text-teal-dark",
  account: "bg-[#e7defb] text-[#6b46c1]",
  creator: "bg-[#fdeeda] text-[#b07514]",
  platform: "bg-[#e5f0fb] text-[#2a6fb8]",
};

const PAGE = 50;

export function ActivityPanel({
  initial,
  actors,
  filters,
}: {
  initial: ActivityRow[];
  actors: { id: string; name: string }[];
  filters: { actor: string; category: string; from: string; to: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [extra, setExtra] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initial.length < PAGE);

  const rows = [...initial, ...extra];
  const hasFilters = filters.actor || filters.category || filters.from || filters.to;

  function paramsFrom(f: typeof filters): URLSearchParams {
    const p = new URLSearchParams();
    if (f.actor) p.set("actor", f.actor);
    if (f.category) p.set("category", f.category);
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
    return p;
  }

  function setParam(key: keyof typeof filters, value: string) {
    router.push(`${pathname}?${paramsFrom({ ...filters, [key]: value }).toString()}`);
  }

  async function loadMore() {
    setLoading(true);
    const params = paramsFrom(filters);
    const cursor = rows[rows.length - 1]?.createdAt;
    if (cursor) params.set("cursor", cursor);
    try {
      const r = await fetch(`/api/activity?${params.toString()}`);
      const { rows: more } = (await r.json()) as { rows: ActivityRow[] };
      setExtra((e) => [...e, ...more]);
      if (more.length < PAGE) setExhausted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-2.5">
        <Filter
          label="User"
          value={filters.actor}
          onChange={(v) => setParam("actor", v)}
          options={[{ value: "", label: "All users" }, ...actors.map((a) => ({ value: a.id, label: a.name }))]}
        />
        <Filter
          label="Type"
          value={filters.category}
          onChange={(v) => setParam("category", v)}
          options={[
            { value: "", label: "All activity" },
            ...ACTIVITY_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
          ]}
        />
        <DateField label="From" value={filters.from} max={filters.to || undefined} onChange={(v) => setParam("from", v)} />
        <DateField label="To" value={filters.to} min={filters.from || undefined} onChange={(v) => setParam("to", v)} />
        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="self-end px-1 py-2.5 text-[12.5px] font-semibold text-teal-dark"
          >
            Clear
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-card border border-dashed border-line py-16 text-slate">
          No activity yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <span
                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: r.actorAvatarColor }}
              >
                {initials(r.actorName)}
              </span>
              <div className="min-w-0 flex-1 text-[13px] leading-snug">
                <b>{r.actorName}</b> <span className="text-slate">{r.description}</span>
              </div>
              <span
                className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase sm:inline ${
                  CATEGORY_STYLES[r.category] ?? "bg-bg text-slate"
                }`}
              >
                {r.category}
              </span>
              <span
                suppressHydrationWarning
                className="shrink-0 text-[11.5px] tabular-nums text-slate"
                title={new Date(r.createdAt).toLocaleString()}
              >
                {relTime(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!exhausted && rows.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-[10px] border border-line px-4 py-2 text-[12.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[11px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
      {label}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[11px] border border-line bg-card px-3 py-[9px] font-normal text-ink outline-none focus:border-teal"
      />
    </label>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
