"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssetListItem } from "@/lib/data";
import { AssetPreview } from "@/components/library/asset-card";
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

  if (assets.length === 0) {
    return (
      <div className="grid place-items-center py-20 text-center text-slate">
        Trash is empty. 🎉
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4">
      {assets.map((a) => (
        <div key={a.id} className="overflow-hidden rounded-[14px] bg-card shadow-card">
          <div className="relative opacity-70">
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
      ))}
    </div>
  );
}
