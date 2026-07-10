import { redirect, notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/lib/session";
import { isAdminRole } from "@/lib/roles";
import { listActivity, listMembers } from "@/lib/data";
import { ActivityPanel } from "@/components/activity/activity-panel";

export const dynamic = "force-dynamic";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    category?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Admin-only, enforced server-side (not just hidden in the nav).
  if (!isAdminRole(user.role)) notFound();

  const sp = await searchParams;
  const [activity, members] = await Promise.all([
    listActivity(user.workspaceId, {
      actorId: sp.actor || undefined,
      category: sp.category || undefined,
      from: sp.from || undefined,
      to: sp.to || undefined,
    }),
    listMembers(user.workspaceId),
  ]);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Activity</h2>
      </div>
      <p className="mb-4 text-[12.5px] text-slate">
        Who did what across the workspace — visible to admins only.
      </p>
      <ActivityPanel
        key={`${sp.actor ?? ""}-${sp.category ?? ""}-${sp.from ?? ""}-${sp.to ?? ""}`}
        initial={activity}
        actors={members.map((m) => ({ id: m.userId, name: m.name }))}
        filters={{
          actor: sp.actor ?? "",
          category: sp.category ?? "",
          from: sp.from ?? "",
          to: sp.to ?? "",
        }}
      />
    </div>
  );
}
