import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listContentBin, type BinFilters } from "@/lib/data";
import { ContentBinView } from "@/components/content-bin/content-bin-view";

export const dynamic = "force-dynamic";

type BinSearchParams = {
  status?: string;
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
  const filters: BinFilters = {
    status: sp.status || undefined,
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
        q: sp.q ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
