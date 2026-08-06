import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getAssetCounts, getBinCount, getMyOpenTaskCount, getPendingReviewCount, getTaskReworkCount, getReadyToPublishCount, getStorageUsage } from "@/lib/data";
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

  const [counts, binCount, myTaskCount, taskReviewCount, taskReworkCount, membersCount, readyCount, unreadCount, storage] =
    await Promise.all([
      getAssetCounts(user.workspaceId),
      getBinCount(user.workspaceId),
      getMyOpenTaskCount(user.workspaceId, user.id),
      getPendingReviewCount(user.workspaceId),
      getTaskReworkCount(user.workspaceId),
      prisma.membership.count({ where: { workspaceId: user.workspaceId } }),
      getReadyToPublishCount(user.workspaceId),
      unreadNotificationCount(user.id),
      getStorageUsage(user.workspaceId),
    ]);

  // R2 free tier is 10 GB; override with STORAGE_LIMIT_GB if you scale the plan.
  const storageLimitBytes = Number(process.env.STORAGE_LIMIT_GB ?? 10) * 1e9;

  return (
    <DialogProvider>
      <div className="grid h-screen grid-cols-[62px_1fr] overflow-hidden">
        <Sidebar
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
            avatarColor: user.avatarColor ?? "#0e9f8f",
            avatarUrl: user.avatarUrl ?? null,
          }}
          workspaceName={user.workspaceName}
          counts={counts}
          binCount={binCount}
          myTaskCount={myTaskCount}
          taskReviewCount={taskReviewCount}
          taskReworkCount={taskReworkCount}
          membersCount={membersCount}
          readyCount={readyCount}
          unreadCount={unreadCount}
          storage={storage}
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
