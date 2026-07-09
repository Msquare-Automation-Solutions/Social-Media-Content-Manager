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
  params: Promise<{ library: string }>;
  searchParams: Promise<{
    person?: string;
    channel?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const { library } = await params;
  const sp = await searchParams;
  const view = SLUG_TO_VIEW[library];
  if (!view) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const filters = {
    personId: sp.person || undefined,
    channelId: sp.channel || undefined,
    q: sp.q || undefined,
    sort: (sp.sort as "newest" | "name") || "newest",
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
      title={meta.label}
      assets={assets}
      people={people}
      channels={channels}
      filters={{
        person: sp.person ?? "",
        channel: sp.channel ?? "",
        q: sp.q ?? "",
        sort: filters.sort,
      }}
      canEdit={user.role !== "VIEWER"}
    />
  );
}
