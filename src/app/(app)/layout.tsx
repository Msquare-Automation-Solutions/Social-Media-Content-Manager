import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSidebarCounts } from "@/lib/data";
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

  // Every badge and the storage gauge in one round trip — this renders on every
  // request, so ten separate queries meant ten chances to pay database latency.
  const c = await getSidebarCounts(user.workspaceId, user.id);

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
          counts={c.assets}
          binCount={c.bin}
          myTaskCount={c.myTasks}
          taskReviewCount={c.taskReview}
          taskReworkCount={c.taskRework}
          membersCount={c.members}
          readyCount={c.ready}
          unreadCount={c.unread}
          storage={c.storage}
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
