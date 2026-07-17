import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listContentBin, type BinFilters } from "@/lib/data";
import { ContentBinView } from "@/components/content-bin/content-bin-view";

export const dynamic = "force-dynamic";

type BinSearchParams = {
  status?: string;
  person?: string;
  account?: string;
  channel?: string;
  type?: string;
  q?: string;
  from?: string;
  to?: string;
};

export default async function ContentBinPage({
  searchParams,
}: {
  searchParams: Promise<BinSearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;

  // Default the Creator filter to the current user's own creator record, so you
  // land on your own captures; "all" widens it to everyone.
  const self = await prisma.person.findFirst({
    where: { workspaceId: user.workspaceId, userId: user.id, deletedAt: null },
    select: { id: true },
  });
  const personValue = sp.person ?? self?.id ?? "all";
  const personId = personValue && personValue !== "all" ? personValue : undefined;

  const filters: BinFilters = {
    status: sp.status || undefined,
    personId,
    accountId: sp.account || undefined,
    channelId: sp.channel || undefined,
    category: sp.type || undefined,
    q: sp.q || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  };
  const items = await listContentBin(user.workspaceId, filters);

  return (
    <ContentBinView
      items={items}
      canEdit={user.role !== "VIEWER"}
      filters={{
        status: sp.status ?? "",
        person: personValue,
        account: sp.account ?? "",
        channel: sp.channel ?? "",
        type: sp.type ?? "",
        q: sp.q ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
