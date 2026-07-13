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
  counts: Record<LibraryViewKey, number>;
  membersCount: number;
  queueCount: number;
  approvedCount: number;
  publishedCount: number;
  unreadCount: number;
};

export function Sidebar({
  user,
  workspaceName,
  counts,
  membersCount,
  queueCount,
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
    <aside className="flex h-screen flex-col gap-[3px] overflow-y-auto border-r border-line/80 bg-gradient-to-b from-card to-bg px-3.5 pb-9 pt-4">
      <div className="flex items-center gap-2.5 px-2 pb-3.5 pt-0.5 font-display text-[17px] font-bold">
        <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand-teal text-white shadow-glow-sm">
          ◆
        </div>
        <span className="min-w-0 flex-1 truncate">{workspaceName}</span>
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

      <NavLink href="/" active={isActive("/")} label="Home" icon="home" />
      <NavLink
        href="/dashboard"
        active={isActive("/dashboard")}
        label="Dashboard"
        icon="dashboard"
      />
      <NavLink
        href="/overview"
        active={isActive("/overview")}
        label="Workspace overview"
        icon="overview"
      />
      <NavLink
        href="/review"
        active={isActive("/review")}
        label="Review queue"
        icon="review"
        count={queueCount || undefined}
        hot={queueCount > 0}
      />
      <NavLink
        href="/approved"
        active={isActive("/approved")}
        label="Approved"
        icon="approved"
        count={approvedCount || undefined}
      />
      <NavLink
        href="/published"
        active={isActive("/published")}
        label="Published"
        icon="published"
        count={publishedCount || undefined}
      />

      <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate/80">
        Library
      </div>
      {LIBRARY_VIEWS.map((v) => {
        const href = `/${LIBRARY_SLUGS[v.key]}`;
        return (
          <NavLink
            key={v.key}
            href={href}
            active={isActive(href)}
            label={v.label}
            icon={VIEW_ICONS[v.key]}
            count={counts[v.key]}
          />
        );
      })}

      <div className="my-3 mx-1 h-px bg-line" />

      <NavLink
        href="/members"
        active={isActive("/members")}
        label="Members"
        icon="members"
        count={membersCount}
      />
      {isAdmin && (
        <NavLink
          href="/activity"
          active={isActive("/activity")}
          label="Activity"
          icon="activity"
        />
      )}
      <NavLink href="/trash" active={isActive("/trash")} label="Trash" icon="trash" />

      <div className="mt-auto">
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
      </div>
    </aside>
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
