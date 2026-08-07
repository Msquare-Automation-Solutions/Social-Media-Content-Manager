"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { SelectAllBar } from "@/components/library/select-all";
import { TYPE_LABELS } from "@/lib/library";
import type { ContentBinRow } from "@/lib/data";

/**
 * Binned ideas in Trash, with restore and permanent delete — laid out as the same
 * cards the deleted assets use, so Trash reads as one place rather than two.
 *
 * Contributors are only ever handed their own (the page scopes the query), so
 * there's no ownership logic here; both endpoints enforce it again regardless.
 */
export function TrashedBinList({ items }: { items: ContentBinRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /**
   * Bulk restore / delete. There's no bulk endpoint for ideas — the counts here are
   * small and the per-item routes already carry the ownership rules, so this fires
   * them together rather than duplicating that logic server-side.
   */
  async function bulk(action: "restore" | "purge") {
    const chosen = items.filter((i) => selected.has(i.id));
    if (!chosen.length) return;
    if (
      action === "purge" &&
      !confirm(
        `Permanently delete ${chosen.length} idea${chosen.length === 1 ? "" : "s"}?\n\nThis can't be undone.`,
      )
    )
      return;

    setBulkBusy(true);
    const results = await Promise.all(
      chosen.map((i) =>
        fetch(
          action === "restore"
            ? `/api/content-bin/${i.id}/restore`
            : `/api/content-bin/${i.id}/purge`,
          { method: action === "restore" ? "POST" : "DELETE" },
        ).then((r) => r.ok),
      ),
    );
    setBulkBusy(false);
    const ok = results.filter(Boolean).length;
    setSelected(new Set());
    toast(
      `${action === "restore" ? "Restored" : "Permanently deleted"} ${ok} of ${chosen.length}` +
        (ok === chosen.length ? "" : " — the rest failed"),
    );
    router.refresh();
  }

  async function restore(item: ContentBinRow) {
    setBusy(item.id);
    const r = await fetch(`/api/content-bin/${item.id}/restore`, { method: "POST" });
    setBusy(null);
    if (r.ok) {
      toast(`“${item.title}” restored ✓`);
      router.refresh();
    } else {
      toast("Couldn't restore.");
    }
  }

  async function purge(item: ContentBinRow) {
    if (
      !confirm(
        `Permanently delete “${item.title}”?\n\nThis can't be undone — it won't be recoverable afterwards.`,
      )
    )
      return;
    setBusy(item.id);
    const r = await fetch(`/api/content-bin/${item.id}/purge`, { method: "DELETE" });
    setBusy(null);
    if (r.ok) {
      toast(`“${item.title}” deleted for good`);
      router.refresh();
    } else {
      toast("Couldn't delete that idea.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-line bg-card px-5 py-10 text-center text-[13px] text-slate shadow-soft">
        Nothing of yours in the Trash.
      </div>
    );
  }

  return (
    <>
      <SelectAllBar
        total={items.length}
        selectedCount={selected.size}
        onSelectAll={() => setSelected(new Set(items.map((i) => i.id)))}
        onClear={() => setSelected(new Set())}
      />

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card px-3 py-2 shadow-soft">
          <span className="text-[12.5px] font-semibold">
            {selected.size} selected
          </span>
          <div className="mx-1 h-5 w-px bg-line" />
          <button
            disabled={bulkBusy}
            onClick={() => bulk("restore")}
            className="btn-premium rounded-[9px] px-3.5 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
          >
            ↩ Restore
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => bulk("purge")}
            className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-[#c23b2a] transition hover:border-[#c23b2a] disabled:opacity-50"
          >
            Delete forever
          </button>
          {bulkBusy && <span className="text-[12px] text-slate">Working…</span>}
        </div>
      )}

    <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 pb-24">
      {items.map((item) => {
        const cover = item.screenshots[0];
        const on = selected.has(item.id);
        return (
          <div
            key={item.id}
            className={`group relative overflow-hidden rounded-card border bg-card shadow-soft ${
              on ? "border-teal ring-2 ring-teal/40" : "border-line/70"
            }`}
          >
            <button
              onClick={() => toggle(item.id)}
              aria-label={on ? "Deselect" : "Select"}
              className={`absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-[7px] border text-white shadow-soft transition ${
                on
                  ? "border-teal bg-teal"
                  : "border-white/80 bg-black/25 opacity-0 group-hover:opacity-100"
              }`}
            >
              {on && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
            {/* Dimmed like the deleted assets, so Trash looks uniformly "gone". */}
            <div className="relative h-[132px] overflow-hidden bg-wash/[0.05] opacity-70">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[26px] text-slate">💡</div>
              )}
            </div>

            <div className="p-3">
              <div className="truncate text-[12.5px] font-semibold">{item.title}</div>
              <div className="mt-0.5 truncate text-[11px] text-slate">
                {item.category ? `${TYPE_LABELS[item.category] ?? item.category} · ` : ""}
                {item.createdBy?.name ?? "Unknown"}
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => restore(item)}
                  disabled={busy === item.id}
                  className="flex-1 rounded-[9px] border border-line py-1.5 text-[12px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
                >
                  ↩ Restore
                </button>
                <button
                  onClick={() => purge(item)}
                  disabled={busy === item.id}
                  title="Delete permanently"
                  className="rounded-[9px] border border-line px-2.5 py-1.5 text-[12px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
