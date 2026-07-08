import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getLibraryAssets } from "@/lib/data";
import { SLUG_TO_VIEW, LIBRARY_VIEWS } from "@/lib/library";
import { LibraryView } from "@/components/library/library-view";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: { library: string };
  searchParams: { person?: string; channel?: string; q?: string; sort?: string };
}) {
  const view = SLUG_TO_VIEW[params.library];
  if (!view) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const filters = {
    personId: searchParams.person || undefined,
    channelId: searchParams.channel || undefined,
    q: searchParams.q || undefined,
    sort: (searchParams.sort as "newest" | "name") || "newest",
  };

  const [assets, people, channels] = await Promise.all([
    getLibraryAssets(user.workspaceId, view, filters),
    prisma.person.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.socialChannel.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
  ]);

  const meta = LIBRARY_VIEWS.find((v) => v.key === view)!;

  return (
    <LibraryView
      title={`${meta.icon} ${meta.label}`}
      assets={assets}
      people={people}
      channels={channels}
      filters={{
        person: searchParams.person ?? "",
        channel: searchParams.channel ?? "",
        q: searchParams.q ?? "",
        sort: filters.sort,
      }}
      canEdit={user.role !== "VIEWER"}
    />
  );
}
