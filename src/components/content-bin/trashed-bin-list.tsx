"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { ContentBinRow } from "@/lib/data";

/**
 * Binned ideas in Trash, with restore and permanent delete. Contributors are only
 * ever handed their own (the page scopes the query), so there's no ownership logic
 * to do here — both endpoints enforce it again regardless.
 */
export function TrashedBinList({ items }: { items: ContentBinRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

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

  async function restore(item: ContentBinRow) {
    setBusy(item.id);
    const r = await fetch(`/api/content-bin/${item.id}/restore`, { method: "POST" });
    setBusy(null);
    if (r.ok) {
      toast(`“${item.title}” restored ✓`);
      router.refresh();
    } else {
      toast("Couldn't restore that idea.");
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
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-ink">{item.title}</div>
            <div className="mt-0.5 text-[11.5px] text-slate">
              {item.createdBy?.name ?? "Unknown"}
              {item.tags.length > 0 && <span> · {item.tags.slice(0, 3).join(", ")}</span>}
            </div>
          </div>
          <button
            onClick={() => restore(item)}
            disabled={busy === item.id}
            className="shrink-0 rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-slate hover:border-teal hover:text-teal-dark disabled:opacity-50"
          >
            {busy === item.id ? "Working…" : "Restore"}
          </button>
          <button
            onClick={() => purge(item)}
            disabled={busy === item.id}
            title="Delete permanently"
            className="shrink-0 rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-[#c23b2a] hover:border-[#c23b2a] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
