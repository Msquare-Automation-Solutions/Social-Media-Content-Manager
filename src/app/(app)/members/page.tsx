import { BackButton } from "@/components/ui/back-button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listMembers, listAccounts } from "@/lib/data";
import { MembersTable } from "@/components/members/members-table";
import { AccountsSection } from "@/components/members/accounts-section";
import { PlatformsManager } from "@/components/platforms/platforms-manager";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [members, accounts, channels] = await Promise.all([
    listMembers(user.workspaceId),
    listAccounts(user.workspaceId),
    prisma.socialChannel.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);
  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Members</h2>
      </div>
      <MembersTable
        members={members}
        currentUserId={user.id}
        canManage={isAdmin}
      />
      <AccountsSection accounts={accounts} canManage={isAdmin} />
      {isAdmin && <PlatformsManager initial={channels} embedded />}
    </div>
  );
}
