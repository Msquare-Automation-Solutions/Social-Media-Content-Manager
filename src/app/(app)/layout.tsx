import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAssetCounts, getBinCount, getMyOpenTaskCount, getPendingReviewCount, getStorageBytes } from "@/lib/data";
import { unreadNotificationCount } from "@/lib/notifications";
import { Sidebar } from "@/components/sidebar";
import { DialogProvider } from "@/components/save/dialog-context";
import { Dialogs } from "@/components/save/dialogs";
import { LiveRefresh } from "@/components/live-refresh";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [counts, binCount, myTaskCount, taskReviewCount, membersCount, queueCount, reworkCount, approvedCount, publishedCount, unreadCount, storageBytes] =
    await Promise.all([
      getAssetCounts(user.workspaceId),
      getBinCount(user.workspaceId),
      getMyOpenTaskCount(user.workspaceId, user.id),
      getPendingReviewCount(user.workspaceId),
      prisma.membership.count({ where: { workspaceId: user.workspaceId } }),
      prisma.mediaAsset.count({
        where: { workspaceId: user.workspaceId, deletedAt: null, status: "PENDING" },
      }),
      prisma.mediaAsset.count({
        where: { workspaceId: user.workspaceId, deletedAt: null, status: "REWORK" },
      }),
      prisma.mediaAsset.count({
        where: { workspaceId: user.workspaceId, deletedAt: null, status: "APPROVED" },
      }),
      prisma.mediaAsset.count({
        where: { workspaceId: user.workspaceId, deletedAt: null, status: "PUBLISHED" },
      }),
      unreadNotificationCount(user.id),
      getStorageBytes(user.workspaceId),
    ]);

  // R2 free tier is 10 GB; override with STORAGE_LIMIT_GB if you scale the plan.
  const storageLimitBytes = Number(process.env.STORAGE_LIMIT_GB ?? 10) * 1e9;

  // The primary account = the workspace's original owner (oldest OWNER member).
  // Only they see the "Review queue"; everyone else sees it as "Pending".
  const primaryOwner = await prisma.membership.findFirst({
    where: { workspaceId: user.workspaceId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  const isPrimaryOwner = primaryOwner?.userId === user.id;

  return (
    <DialogProvider>
      <div className="grid h-screen grid-cols-[62px_1fr] overflow-hidden">
        <Sidebar
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
            avatarColor: user.avatarColor ?? "#0e9f8f",
          }}
          workspaceName={user.workspaceName}
          isPrimaryOwner={isPrimaryOwner}
          counts={counts}
          binCount={binCount}
          myTaskCount={myTaskCount}
          taskReviewCount={taskReviewCount}
          membersCount={membersCount}
          queueCount={queueCount}
          reworkCount={reworkCount}
          approvedCount={approvedCount}
          publishedCount={publishedCount}
          unreadCount={unreadCount}
          storageBytes={storageBytes}
          storageLimitBytes={storageLimitBytes}
        />
        {/* When the rail (peer/nav) is hovered and the panel slides in, push the
            page right by the panel width so content isn't covered; slide back on leave. */}
        <main className="flex h-screen flex-col overflow-hidden transition-[padding] duration-200 ease-premium peer-hover/nav:pl-[248px]">
          {children}
        </main>
      </div>
      <Dialogs canUpload={user.role !== "VIEWER"} />
      <LiveRefresh />
    </DialogProvider>
  );
}
