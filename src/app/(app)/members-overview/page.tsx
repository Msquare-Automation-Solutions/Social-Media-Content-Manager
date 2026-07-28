import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMembersOverview } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import { MembersOverview } from "@/components/members/members-overview";

export const dynamic = "force-dynamic";

export default async function MembersOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminRole(user.role)) notFound();

  const sp = await searchParams;
  const rows = await getMembersOverview(user.workspaceId, { from: sp.from, to: sp.to });
  const status = sp.status === "onTime" || sp.status === "delay" ? sp.status : "";

  return (
    <MembersOverview
      rows={rows}
      filters={{ from: sp.from ?? "", to: sp.to ?? "", status }}
    />
  );
}
