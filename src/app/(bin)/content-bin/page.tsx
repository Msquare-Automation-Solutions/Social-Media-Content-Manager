import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listContentBin, type BinFilters } from "@/lib/data";
import { getWorkspaceOptions } from "@/lib/options";
import { isAdminRole, isContributor } from "@/lib/roles";
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

  // Creator filter defaults to All creators; pick a person to narrow.
  const personValue = sp.person ?? "all";
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
  // Both in the render, so the browser doesn't have to ask for the dropdown data
  // afterwards — that round trip is most of the wait on a page open.
  const [items, options] = await Promise.all([
    listContentBin(user.workspaceId, filters),
    getWorkspaceOptions(user),
  ]);

  return (
    <ContentBinView
      items={items}
      canEdit={user.role !== "VIEWER"}
      isAdmin={isAdminRole(user.role)}
      meId={user.id}
      contributor={isContributor(user.role)}
      initialOptions={options}
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
