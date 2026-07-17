"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LIBRARY_VIEWS, LIBRARY_SLUGS, type LibraryViewKey } from "@/lib/library";
import { initials } from "@/lib/colors";
import { useUploadDialog } from "@/components/save/dialog-context";
import { Icon, type IconName } from "@/components/ui/icons";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const VIEW_ICONS: Record<LibraryViewKey, IconName> = {
  IMAGE: "images",
  THUMBNAIL: "thumbnails",
  VIDEO: "videos",
  BLOGPOST: "blog",
  OTHER: "other",
};

type Props = {
  user: { name: string; email: string; role: string; avatarColor: string };
  workspaceName: string;
  isPrimaryOwner: boolean;
  counts: Record<LibraryViewKey, number>;
  binCount: number;
  myTaskCount: number;
  taskReviewCount: number;
  membersCount: number;
  queueCount: number;
  reworkCount: number;
  approvedCount: number;
  publishedCount: number;
  unreadCount: number;
};

export function Sidebar({
  user,
  workspaceName,
  isPrimaryOwner,
  counts,
  binCount,
  myTaskCount,
  taskReviewCount,
  membersCount,
  queueCount,
  reworkCount,
  approvedCount,
  publishedCount,
  unreadCount,
}: Props) {
  const pathname = usePathname();
  const upload = useUploadDialog();
  const canUpload = user.role !== "VIEWER";
  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="flex h-screen flex-col border-r border-line/80 bg-gradient-to-b from-card to-bg px-3.5 pb-5 pt-4">
      <div className="flex items-center gap-2 px-1 pb-3.5 pt-0.5 font-display text-[14px] font-bold">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-brand-teal text-[13px] text-white shadow-glow-sm">
          ◆
        </div>
        <span className="min-w-0 flex-1 truncate" title={workspaceName}>{workspaceName}</span>
        <NotificationBell initialUnread={unreadCount} />
      </div>

      {canUpload && (
        <button
          onClick={() => upload.open()}
          className="btn-premium mb-3.5 flex items-center justify-center gap-2 rounded-[12px] px-3.5 py-2.5 font-semibold"
        >
          <Icon name="upload" size={17} /> Upload files
        </button>
      )}

      {/* Only the nav list scrolls (vertical only) — the header (with the
          notification dropdown) and footer stay put and aren't clipped. */}
      <nav className="-mr-2 flex min-h-0 flex-1 flex-col gap-[3px] overflow-y-auto overflow-x-hidden overscroll-contain pr-2">
      <GroupLabel>Create</GroupLabel>
      <NavLink href="/create" active={isActive("/create")} label="Content Creator" icon="create" />
      <NavLink
        href="/content-bin"
        active={isActive("/content-bin")}
        label="Content Bin"
        icon="bin"
        count={binCount || undefined}
      />

      <GroupLabel>Produce</GroupLabel>
      <NavLink
        href="/content-overview"
        active={isActive("/content-overview")}
        label="Content Overview"
        icon="overview"
      />
      <NavLink
        href="/tasks"
        active={pathname === "/tasks"}
        label="Tasks board"
        icon="tasks"
      />
      <NavLink
        href="/my-work"
        active={isActive("/my-work")}
        label="My Work"
        icon="mywork"
        count={myTaskCount || undefined}
        hot={myTaskCount > 0}
      />
      {isAdmin && (
        <NavLink
          href="/tasks/review"
          active={isActive("/tasks/review")}
          label="To review"
          icon="review"
          count={taskReviewCount || undefined}
          hot={taskReviewCount > 0}
        />
      )}

      <GroupLabel>Review &amp; publish</GroupLabel>
      <NavLink
        href="/review"
        active={isActive("/review")}
        label={isPrimaryOwner ? "Review queue" : "Pending"}
        icon="review"
        count={queueCount || undefined}
        hot={queueCount > 0}
      />
      <NavLink
        href="/rework"
        active={isActive("/rework")}
        label="Needs rework"
        icon="rework"
        count={reworkCount || undefined}
        hot={reworkCount > 0}
      />
      <NavLink href="/approved" active={isActive("/approved")} label="Approved" icon="approved" count={approvedCount || undefined} />
      <NavLink href="/published" active={isActive("/published")} label="Published" icon="published" count={publishedCount || undefined} />

      <GroupLabel>Library</GroupLabel>
      <NavLink href="/" active={isActive("/")} label="Workspace overview" icon="overview" />
      {LIBRARY_VIEWS.map((v) => {
        const href = `/${LIBRARY_SLUGS[v.key]}`;
        return (
          <NavLink key={v.key} href={href} active={isActive(href)} label={v.label} icon={VIEW_ICONS[v.key]} count={counts[v.key]} />
        );
      })}

      <GroupLabel>Insights</GroupLabel>
      <NavLink href="/dashboard" active={isActive("/dashboard")} label="Dashboard" icon="dashboard" />
      <NavLink href="/analytics" active={isActive("/analytics")} label="Analytics" icon="analytics" />

      <GroupLabel>Workspace</GroupLabel>
      <NavLink href="/members" active={isActive("/members")} label="Members" icon="members" count={membersCount} />
      {isAdmin && <NavLink href="/activity" active={isActive("/activity")} label="Activity" icon="activity" />}
      <NavLink href="/trash" active={isActive("/trash")} label="Trash" icon="trash" />
      </nav>

      <div className="pt-3">
        <Link
          href="/account"
          className="flex items-center gap-2.5 rounded-[12px] bg-wash/[0.03] px-3 py-2.5 transition duration-200 hover:bg-wash/[0.06]"
        >
          <div
            className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold text-white shadow-soft"
            style={{ background: user.avatarColor }}
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <b className="block text-[12.5px]">{user.name}</b>
            <span className="block truncate text-[11px] text-slate">
              {user.email} · {roleLabel(user.role)}
            </span>
          </div>
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-line py-2.5 font-medium text-slate hover:bg-bg hover:text-[#c23b2a]"
          >
            <Icon name="signout" size={16} /> Sign out
          </button>
          <ThemeToggle />
        </div>
        <a
          href="https://github.com/Msquare-Automation-Solutions/Social-Media-Content-Manager"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-[10.5px] text-slate/60 transition hover:text-slate"
        >
          Built by Msquare Automation Solutions
        </a>
      </div>
    </aside>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate/80">
      {children}
    </div>
  );
}

function NavLink({
  href,
  active,
  label,
  icon,
  count,
  hot = false,
}: {
  href: string;
  active: boolean;
  label: string;
  icon?: IconName;
  count?: number;
  hot?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 font-medium transition duration-200 ease-premium ${
        active
          ? "bg-teal-soft font-semibold text-teal-dark shadow-[inset_0_0_0_1px_rgba(14,159,143,0.16)]"
          : "text-slate hover:bg-wash/[0.04] hover:text-ink"
      }`}
    >
      {icon && (
        <Icon
          name={icon}
          className={`flex-shrink-0 transition-opacity ${
            active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
          }`}
        />
      )}
      {label}
      {count !== undefined && (
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
            hot
              ? "bg-[#e0912b] text-white shadow-soft"
              : active
                ? "bg-card text-teal-dark shadow-soft"
                : "bg-wash/[0.05] text-slate"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
