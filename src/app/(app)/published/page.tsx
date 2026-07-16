import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getPublishedAssets } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { resolveListFilters, type ListSearchParams } from "@/lib/list-filters";
import { ApprovedView } from "@/components/approved/approved-view";

export const dynamic = "force-dynamic";

export default async function PublishedPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const { filters, view } = await resolveListFilters({ workspaceId: user.workspaceId, id: user.id, role: user.role }, sp);

  const [assets, people, channels, accounts] = await Promise.all([
    getPublishedAssets(user.workspaceId, filters),
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

  return (
    <ApprovedView
      assets={assets}
      people={people}
      channels={channels}
      accounts={accounts}
      filters={view}
      canEdit={user.role !== "VIEWER"}
      canReview={isAdminRole(user.role)}
      initialAssetId={sp.asset ?? null}
      title="Published"
      subtitle="Content that's live — everything marked published after it went out."
      emptyText="Nothing published yet — mark an approved item as published once it's live."
    />
  );
}
