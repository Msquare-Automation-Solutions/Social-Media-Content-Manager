import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAssetsByStatus } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { ApprovedView } from "@/components/approved/approved-view";

export const dynamic = "force-dynamic";

export default async function ReworkPage({
  searchParams,
}: {
  searchParams: Promise<{
    person?: string;
    channel?: string;
    type?: string;
    q?: string;
    sort?: string;
    asset?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const filters = {
    personId: sp.person || undefined,
    channelId: sp.channel || undefined,
    type: sp.type || undefined,
    q: sp.q || undefined,
    sort: (sp.sort as "newest" | "name" | "postdate") || "newest",
  };

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
      filters={{
        person: sp.person ?? "",
        channel: sp.channel ?? "",
        type: sp.type ?? "",
        q: sp.q ?? "",
        sort: filters.sort,
      }}
      canEdit={user.role !== "VIEWER"}
      canReview={isAdminRole(user.role)}
      initialAssetId={sp.asset ?? null}
      title="Rework"
      subtitle="Items an admin sent back — edit and resubmit to move them into review again."
      emptyText="Nothing needs rework right now."
    />
  );
}
