"use client";

import { useState, useTransition } from "react";
import { BackButton } from "@/components/ui/back-button";
import { useRouter, usePathname } from "next/navigation";
import type { AssetListItem } from "@/lib/data";
import { LIBRARY_VIEWS } from "@/lib/library";
import { AssetCard } from "@/components/library/asset-card";
import { AssetDrawer } from "@/components/library/asset-drawer";

type Props = {
  assets: AssetListItem[];
  people: { id: string; name: string }[];
  channels: { id: string; name: string; icon: string }[];
  filters: { person: string; channel: string; type: string; q: string; sort: string };
  canEdit: boolean;
  canReview: boolean;
  title?: string;
  subtitle?: string;
  emptyText?: string;
};

// A browsable gallery of a status bucket (Approved / Published) — cards with
// live previews of the media / link, filterable by person, platform, category.
export function ApprovedView({
  assets,
  people,
  channels,
  filters,
  canEdit,
  canReview,
  title = "Approved",
  subtitle = "Everything signed off and ready to publish — preview any card to open, download, or edit it.",
  emptyText = "Nothing approved yet — items show here once an admin approves them from the review queue.",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams({
      ...(filters.person && { person: filters.person }),
      ...(filters.channel && { channel: filters.channel }),
      ...(filters.type && { type: filters.type }),
      ...(filters.q && { q: filters.q }),
      ...(filters.sort && filters.sort !== "newest" && { sort: filters.sort }),
    });
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasFilters = filters.person || filters.channel || filters.type || filters.q;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">{title}</h2>
        {assets.length > 0 && (
          <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[12px] font-bold text-teal-dark tabular-nums">
            {assets.length}
          </span>
        )}
        {pending && <span className="text-[12px] text-slate">Filtering…</span>}
      </div>
      <p className="mb-4 text-[13px] text-slate">{subtitle}</p>

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
        <FilterSelect
          label="Category"
          value={filters.type}
          onChange={(v) => setParam("type", v)}
          options={[
            { value: "", label: "All types" },
            ...LIBRARY_VIEWS.map((v) => ({ value: v.key, label: v.label })),
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
            { value: "postdate", label: "Post date" },
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

      {assets.length === 0 ? (
        <div className="grid place-items-center py-20 text-center text-slate">
          {hasFilters ? "No items match — adjust the filters." : emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 pb-24">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} onOpen={() => setSelectedId(a.id)} />
          ))}
        </div>
      )}

      {selectedId && (
        <AssetDrawer
          assetId={selectedId}
          canEdit={canEdit}
          canReview={canReview}
          onClose={() => setSelectedId(null)}
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
