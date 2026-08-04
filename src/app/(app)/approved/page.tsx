import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listCreatorPeople } from "@/lib/people";
import { prisma } from "@/lib/db";
import { getApprovedAssets } from "@/lib/data";
import { resolveListFilters, type ListSearchParams } from "@/lib/list-filters";
import { isAdminRole } from "@/lib/roles";
import { ApprovedView } from "@/components/approved/approved-view";

export const dynamic = "force-dynamic";

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const { filters, view } = await resolveListFilters({ workspaceId: user.workspaceId, id: user.id, role: user.role }, sp);

  const [assets, people, channels, accounts] = await Promise.all([
    getApprovedAssets(user.workspaceId, filters),
    listCreatorPeople(user.workspaceId),
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

  return (
    <ApprovedView
      title="Ready to publish"
      subtitle="One file per task, bundling every stage's work — these appear once all of a task's stages are approved. Open a card to review the parts and publish it."
      emptyText="Nothing ready yet. A task's file appears here once every one of its stages is approved."
      assets={assets}
      people={people}
      channels={channels}
      accounts={accounts}
      filters={view}
      canEdit={user.role !== "VIEWER"}
      canReview={isAdminRole(user.role)}
      initialAssetId={sp.asset ?? null}
    />
  );
}
