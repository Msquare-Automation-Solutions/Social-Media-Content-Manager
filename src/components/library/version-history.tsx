"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

type Version = { id: string; createdAt: string; editedBy: string };

export function VersionHistory({
  assetId,
  canRestore,
  onRestored,
}: {
  assetId: string;
  canRestore: boolean;
  onRestored: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: versions, refetch } = useQuery<Version[]>({
    queryKey: ["versions", assetId],
    queryFn: async () => (await fetch(`/api/assets/${assetId}/versions`)).json(),
  });

  if (!versions || versions.length === 0) return null;

  async function restore(v: Version) {
    if (!confirm("Restore this version? The current state is saved as a new version first."))
      return;
    setBusy(v.id);
    const r = await fetch(`/api/assets/${assetId}/versions/${v.id}/restore`, {
      method: "POST",
    });
    setBusy(null);
    if (r.ok) {
      toast("Version restored ✓");
      refetch();
      onRestored();
    } else {
      toast("Couldn't restore version.");
    }
  }

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate">
        Version history ({versions.length})
      </h3>
      <div className="divide-y divide-line rounded-[12px] border border-line">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
            <span className="flex-1">
              {new Date(v.createdAt).toLocaleString()}{" "}
              <span className="text-slate">· by {v.editedBy}</span>
            </span>
            {canRestore && (
              <button
                onClick={() => restore(v)}
                disabled={busy === v.id}
                className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal disabled:opacity-50"
              >
                Restore
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
