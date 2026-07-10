import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getScheduledThisMonthAssets } from "@/lib/data";
import { resolveListFilters, type ListSearchParams } from "@/lib/list-filters";
import { isAdminRole } from "@/lib/roles";
import { ApprovedView } from "@/components/approved/approved-view";

export const dynamic = "force-dynamic";

export default async function ScheduledPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  // Default to post-date order — most useful for a schedule.
  const { filters, view } = await resolveListFilters({ workspaceId: user.workspaceId, id: user.id, role: user.role }, sp, "postdate");

  const [assets, people, channels] = await Promise.all([
    getScheduledThisMonthAssets(user.workspaceId, filters),
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
  ]);

  return (
    <ApprovedView
      assets={assets}
      people={people}
      channels={channels}
      filters={view}
      canEdit={user.role !== "VIEWER"}
      canReview={isAdminRole(user.role)}
      initialAssetId={sp.asset ?? null}
      title="Scheduled this month"
      subtitle="Content with a post date set for this month — sorted by when it goes out."
      emptyText="Nothing scheduled this month — add post dates in the save dialog."
    />
  );
}
