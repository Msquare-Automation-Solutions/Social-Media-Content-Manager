import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listMembers, listPendingInvites, listCreators } from "@/lib/data";
import { MembersTable } from "@/components/members/members-table";
import { CreatorsSection } from "@/components/members/creators-section";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [members, invites, creators] = await Promise.all([
    listMembers(user.workspaceId),
    user.role === "ADMIN" || user.role === "OWNER"
      ? listPendingInvites(user.workspaceId)
      : Promise.resolve([]),
    listCreators(user.workspaceId),
  ]);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">Members</h2>
      </div>
      <MembersTable
        members={members}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        currentUserId={user.id}
        canManage={user.role === "ADMIN" || user.role === "OWNER"}
      />
      <CreatorsSection creators={creators} canManage={user.role !== "VIEWER"} />
    </div>
  );
}
