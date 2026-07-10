import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAssetsByStatus } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { resolveListFilters, type ListSearchParams } from "@/lib/list-filters";
import { ApprovedView } from "@/components/approved/approved-view";

export const dynamic = "force-dynamic";

export default async function ReworkPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const { filters, view } = await resolveListFilters({ workspaceId: user.workspaceId, id: user.id, role: user.role }, sp);

  const [assets, people, channels] = await Promise.all([
    getAssetsByStatus(user.workspaceId, "REWORK", filters),
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
      title="Rework"
      subtitle="Items an admin sent back — edit and resubmit to move them into review again."
      emptyText="Nothing needs rework right now."
    />
  );
}
