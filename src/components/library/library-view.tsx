"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { AssetListItem } from "@/lib/data";
import { AssetCard } from "@/components/library/asset-card";
import { AssetDrawer } from "@/components/library/asset-drawer";
import { BulkBar } from "@/components/library/bulk-bar";
import { SelectAllBar } from "@/components/library/select-all";

type Props = {
  title: string;
  assets: AssetListItem[];
  people: { id: string; name: string }[];
  channels: { id: string; name: string; icon: string }[];
  filters: { person: string; channel: string; q: string; sort: string };
  canEdit: boolean;
};

export function LibraryView({ title, assets, people, channels, filters, canEdit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // Filters persist in the URL (combine with AND, server refilters).
  function setParam(key: string, value: string) {
    const params = new URLSearchParams({
      ...(filters.person && { person: filters.person }),
      ...(filters.channel && { channel: filters.channel }),
      ...(filters.q && { q: filters.q }),
      ...(filters.sort && filters.sort !== "newest" && { sort: filters.sort }),
    });
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = filters.person || filters.channel || filters.q;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">{title}</h2>
        {pending && <span className="text-[12px] text-slate">Filtering…</span>}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-end gap-2.5">
        <FilterSelect
          label="Person"
          value={filters.person}
          onChange={(v) => setParam("person", v)}
          options={[{ value: "", label: "All people" }, ...people.map((p) => ({ value: p.id, label: p.name }))]}
        />
        <FilterSelect
          label="Social platform"
          value={filters.channel}
          onChange={(v) => setParam("channel", v)}
          options={[
            { value: "", label: "All platforms" },
            ...channels.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
          ]}
        />
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-slate">
          Search
          <input
            defaultValue={filters.q}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", (e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => filters.q !== e.target.value && setParam("q", e.target.value)}
            placeholder="Title or tag…"
            className="rounded-[11px] border border-line bg-card px-3 py-2.5 font-normal text-ink outline-none focus:border-teal"
          />
        </label>
        <FilterSelect
          label="Sort"
          value={filters.sort}
          onChange={(v) => setParam("sort", v)}
          options={[
            { value: "newest", label: "Newest" },
            { value: "name", label: "Name (A–Z)" },
          ]}
        />
        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.push(pathname))}
            className="self-end px-1 py-2.5 text-[12.5px] font-semibold text-teal-dark"
          >
            Clear filters
          </button>
        )}
      </div>

      {canEdit && assets.length > 0 && (
        <SelectAllBar
          total={assets.length}
          selectedCount={selected.size}
          onSelectAll={() => setSelected(new Set(assets.map((a) => a.id)))}
          onClear={() => setSelected(new Set())}
        />
      )}

      {assets.length === 0 ? (
        <div className="grid place-items-center py-20 text-center text-slate">
          No items match — adjust filters, or create something in chat.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 pb-24">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              onOpen={() => setSelectedId(a.id)}
              selected={selected.has(a.id)}
              selecting={selected.size > 0}
              onToggleSelect={canEdit ? () => toggleSelect(a.id) : undefined}
            />
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          ids={[...selected]}
          people={people}
          onClear={() => setSelected(new Set())}
          onDone={() => {
            setSelected(new Set());
            router.refresh();
          }}
        />
      )}

      {selectedId && (
        <AssetDrawer
          assetId={selectedId}
          canEdit={canEdit}
          onClose={() => setSelectedId(null)}
          // Refresh the grid in the background but keep the drawer open, so
          // edits reveal the new version snapshot rather than dismissing it.
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function FilterSelect({
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
