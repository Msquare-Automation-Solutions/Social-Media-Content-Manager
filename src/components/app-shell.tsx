import { getSidebarCounts, getBinCount } from "@/lib/data";
import { LIBRARY_VIEWS, type LibraryViewKey } from "@/lib/library";
import { hasRole, isContributor } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";
import { DialogProvider } from "@/components/save/dialog-context";
import { Dialogs } from "@/components/save/dialogs";
import { LiveRefresh } from "@/components/live-refresh";

const ZERO_COUNTS = Object.fromEntries(LIBRARY_VIEWS.map((v) => [v.key, 0])) as Record<
  LibraryViewKey,
  number
>;

/**
 * The chrome every signed-in page sits in: rail + sidebar + main column.
 *
 * Shared by the two route groups so they can't drift. `(app)` holds the full
 * product and redirects contributors away; `(bin)` holds the Content Bin and the
 * leaderboard, which contributors *and* the team both use — the difference is
 * only which sidebar they get.
 */
export async function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const restricted = isContributor(user.role);

  // A contributor can't open anything the other badges describe, so don't spend
  // the query on them — and don't leak task or review counts into their nav.
  const counts = restricted ? null : await getSidebarCounts(user.workspaceId, user.id);
  const binCount = restricted ? await getBinCount(user.workspaceId) : counts!.bin;

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
          restricted={restricted}
          counts={counts?.assets ?? ZERO_COUNTS}
          binCount={binCount}
          myTaskCount={counts?.myTasks ?? 0}
          taskReviewCount={counts?.taskReview ?? 0}
          taskReworkCount={counts?.taskRework ?? 0}
          membersCount={counts?.members ?? 0}
          readyCount={counts?.ready ?? 0}
          unreadCount={counts?.unread ?? 0}
          storage={counts?.storage ?? { total: 0, active: 0, trashed: 0 }}
          storageLimitBytes={storageLimitBytes}
        />
        {/* When the rail (peer/nav) is hovered and the panel slides in, push the
            page right by the panel width so content isn't covered; slide back on leave. */}
        <main className="flex h-screen flex-col overflow-hidden transition-[padding] duration-200 ease-premium peer-hover/nav:pl-[248px]">
          {children}
        </main>
      </div>
      {/* The media save dialog belongs to the library, which contributors have no
          access to; bin screenshots upload through the composer instead. */}
      <Dialogs canUpload={hasRole(user.role, "EDITOR")} />
      <LiveRefresh />
    </DialogProvider>
  );
}
