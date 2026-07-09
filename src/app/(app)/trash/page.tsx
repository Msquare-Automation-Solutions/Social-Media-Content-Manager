import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrashedAssets } from "@/lib/data";
import { TrashView } from "@/components/library/trash-view";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const assets = await getTrashedAssets(user.workspaceId);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">Trash</h2>
      </div>
      <p className="mb-4 text-[12.5px] text-slate">
        Deleted items are kept for 30 days, then permanently removed.
      </p>
      <TrashView assets={assets} canRestore={user.role !== "VIEWER"} />
    </div>
  );
}
