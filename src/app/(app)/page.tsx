import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getWorkspaceOverview } from "@/lib/data";
import { WorkspaceOverview } from "@/components/overview/workspace-overview";

export const dynamic = "force-dynamic";

// Home now lands on the workspace overview (the chat studio moved to /create).
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const overview = await getWorkspaceOverview(user.workspaceId, {
    status: sp.status || undefined,
    from: sp.from || undefined,
    to: sp.to || undefined,
  });
  return (
    <WorkspaceOverview
      overview={overview}
      filters={{ status: sp.status ?? "", from: sp.from ?? "", to: sp.to ?? "" }}
    />
  );
}
