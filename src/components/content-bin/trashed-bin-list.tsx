"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 pb-24">
      {items.map((item) => {
        const cover = item.screenshots[0];
        return (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-card border border-line/70 bg-card shadow-soft"
          >
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
  );
}
