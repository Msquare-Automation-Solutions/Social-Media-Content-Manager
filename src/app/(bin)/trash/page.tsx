import { BackButton } from "@/components/ui/back-button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrashedAssets, getTrashedBinItems } from "@/lib/data";
import { isContributor } from "@/lib/roles";
import { TrashView } from "@/components/library/trash-view";
import { TrashedBinList } from "@/components/content-bin/trashed-bin-list";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // A contributor's Trash is only ever their own binned ideas — they have no
  // library to delete from, and other people's ideas aren't theirs to restore.
  const contributor = isContributor(user.role);
  const [assets, binItems] = await Promise.all([
    contributor ? Promise.resolve([]) : getTrashedAssets(user.workspaceId),
    getTrashedBinItems(user.workspaceId, contributor ? user.id : undefined),
  ]);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1 flex items-center gap-3.5">
        {!contributor && <BackButton />}
        <h2 className="font-display text-[19px]">Trash</h2>
      </div>
      <p className="mb-4 text-[12.5px] text-slate">
        Deleted items are kept for 30 days, then permanently removed.
      </p>

      {contributor ? (
        <TrashedBinList items={binItems} />
      ) : (
        <>
          <TrashView assets={assets} canRestore={user.role !== "VIEWER"} />
          {binItems.length > 0 && (
            <>
              <h3 className="mb-2 mt-7 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">
                Content Bin ideas
              </h3>
              <TrashedBinList items={binItems} />
            </>
          )}
        </>
      )}
    </div>
  );
}
