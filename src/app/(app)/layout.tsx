import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAssetCounts } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { DialogProvider } from "@/components/save/dialog-context";
import { Dialogs } from "@/components/save/dialogs";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [counts, membersCount] = await Promise.all([
    getAssetCounts(user.workspaceId),
    prisma.membership.count({ where: { workspaceId: user.workspaceId } }),
  ]);

  return (
    <DialogProvider>
      <div className="grid h-screen grid-cols-[242px_1fr]">
        <Sidebar
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
            avatarColor: user.avatarColor ?? "#0e9f8f",
          }}
          workspaceName={user.workspaceName}
          counts={counts}
          membersCount={membersCount}
        />
        <main className="flex h-screen flex-col overflow-hidden">{children}</main>
      </div>
      <Dialogs />
    </DialogProvider>
  );
}
