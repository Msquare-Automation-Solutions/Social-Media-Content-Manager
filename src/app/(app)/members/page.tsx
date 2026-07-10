import { BackButton } from "@/components/ui/back-button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listMembers, listCreators } from "@/lib/data";
import { MembersTable } from "@/components/members/members-table";
import { CreatorsSection } from "@/components/members/creators-section";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [members, creators] = await Promise.all([
    listMembers(user.workspaceId),
    listCreators(user.workspaceId),
  ]);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Members</h2>
      </div>
      <MembersTable
        members={members}
        currentUserId={user.id}
        canManage={user.role === "ADMIN" || user.role === "OWNER"}
      />
      <CreatorsSection creators={creators} canManage={user.role !== "VIEWER"} />
    </div>
  );
}
