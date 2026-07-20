import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAssetsByStatus } from "@/lib/data";
import { resolveListFilters, type ListSearchParams } from "@/lib/list-filters";
import { isAdminRole } from "@/lib/roles";
import { ApprovedView } from "@/components/approved/approved-view";

export const dynamic = "force-dynamic";

// The review queue is a card gallery of everything awaiting approval, same
// filterable grid as the Approved / library lists. Opening a card's drawer is
// where admins Approve / Request rework (canReview drives those controls).
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const { filters, view } = await resolveListFilters(
    { workspaceId: user.workspaceId, id: user.id, role: user.role },
    sp,
  );

  const [assets, people, channels, accounts] = await Promise.all([
    getAssetsByStatus(user.workspaceId, "PENDING", filters),
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.socialChannel.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.account.findMany({
      where: { workspaceId: user.workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  const canReview = isAdminRole(user.role);
  return (
    <ApprovedView
      assets={assets}
      people={people}
      channels={channels}
      accounts={accounts}
      filters={view}
      canEdit={user.role !== "VIEWER"}
      canReview={canReview}
      title={user.role === "OWNER" ? "Review queue" : "Pending"}
      subtitle={
        canReview
          ? "Everything awaiting approval, open a card to preview it, then approve or send it back for rework."
          : "Everything awaiting approval, open a card to preview it and see its review status."
      }
      emptyText="🎉 Queue’s clear, nothing waiting for review."
      initialAssetId={sp.asset ?? null}
    />
  );
}
