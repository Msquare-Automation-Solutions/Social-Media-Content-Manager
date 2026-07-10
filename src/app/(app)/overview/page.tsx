import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getWorkspaceOverview } from "@/lib/data";
import { WorkspaceOverview } from "@/components/overview/workspace-overview";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = await getWorkspaceOverview(user.workspaceId);
  return <WorkspaceOverview overview={overview} />;
}
