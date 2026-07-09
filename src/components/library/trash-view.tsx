"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssetListItem } from "@/lib/data";
import { AssetPreview } from "@/components/library/asset-card";
import { SelectAllBar } from "@/components/library/select-all";
import { TYPE_LABELS } from "@/lib/library";
import { useToast } from "@/components/ui/toast";

export function TrashView({
  assets,
  canRestore,
}: {
  assets: AssetListItem[];
  canRestore: boolean;
}) {
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

  async function restore(a: AssetListItem) {
    setBusy(a.id);
    const r = await fetch(`/api/assets/${a.id}/restore`, { method: "POST" });
    setBusy(null);
    if (r.ok) {
      toast(`“${a.title}” restored ✓`);
      router.refresh();
    } else {
      toast("Couldn't restore.");
    }
  }

  async function bulk(action: "restore" | "purge") {
    if (
      action === "purge" &&
      !confirm(
        `Permanently delete ${selected.size} item${selected.size === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    setBulkBusy(true);
    const r = await fetch("/api/assets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], action }),
    });
    setBulkBusy(false);
    if (!r.ok) {
      toast("Bulk action failed.");
      return;
    }
    const { applied, skipped } = await r.json();
    toast(
      `${action === "restore" ? "Restored" : "Permanently deleted"} ${applied} item${applied === 1 ? "" : "s"}` +
        (skipped ? ` · ${skipped} skipped (no access)` : ""),
    );
    setSelected(new Set());
    router.refresh();
  }

  if (assets.length === 0) {
    return (
      <div className="grid place-items-center py-20 text-center text-slate">
        Trash is empty.
      </div>
    );
  }

  return (
    <>
      {canRestore && (
        <SelectAllBar
          total={assets.length}
          selectedCount={selected.size}
          onSelectAll={() => setSelected(new Set(assets.map((a) => a.id)))}
          onClear={() => setSelected(new Set())}
        />
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 pb-24">
        {assets.map((a) => {
          const on = selected.has(a.id);
          return (
            <div
              key={a.id}
              className={`group relative overflow-hidden rounded-card border bg-card shadow-soft ${
                on ? "border-teal ring-2 ring-teal/40" : "border-line/70"
              }`}
            >
              {canRestore && (
                <button
                  onClick={() => toggle(a.id)}
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
              )}
              <div className="opacity-70">
                <AssetPreview asset={a} />
              </div>
              <div className="p-3">
                <div className="truncate text-[12.5px] font-semibold">{a.title}</div>
                <div className="mt-0.5 text-[11px] text-slate">
                  {TYPE_LABELS[a.type] ?? a.type} · deleted{" "}
                  {new Date(a.createdAt).toLocaleDateString()}
                </div>
                {canRestore && (
                  <button
                    onClick={() => restore(a)}
                    disabled={busy === a.id}
                    className="mt-2 w-full rounded-[9px] border border-line py-1.5 text-[12px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
                  >
                    ↩ Restore
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl2 border border-line/70 bg-card/95 p-2 pl-4 shadow-lift backdrop-blur">
            <span className="text-[13px] font-semibold">{selected.size} selected</span>
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
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-[9px] px-2 py-1.5 text-[12.5px] font-semibold text-slate hover:text-ink"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}
