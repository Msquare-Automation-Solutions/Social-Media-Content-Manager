"use client";

import { useState } from "react";
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

  type Item = { href: string; label: string; icon: IconName; count?: number; hot?: boolean; active: boolean };
  type Group = { key: string; label?: string; items: Item[] };
  type Area = { key: string; label: string; icon: IconName; hot: boolean; groups: Group[] };
  const it = (href: string, label: string, icon: IconName, active: boolean, count?: number, hot?: boolean): Item => ({ href, label, icon, active, count, hot });

  const AREAS: Area[] = [
    {
      key: "home",
      label: "Home",
      icon: "home",
      hot: false,
      groups: [
        {
          key: "home",
          items: [
            it("/", "Workspace overview", "overview", isActive("/")),
            it("/dashboard", "Dashboard", "dashboard", isActive("/dashboard")),
          ],
        },
      ],
    },
    {
      key: "content",
      label: "Content",
      icon: "images",
      hot: queueCount > 0 || reworkCount > 0,
      groups: [
        {
          key: "create",
          label: "Create",
          items: [
            it("/content-bin", "Content Bin", "bin", isActive("/content-bin"), binCount || undefined),
          ],
        },
        {
          key: "library",
          label: "Library",
          items: LIBRARY_VIEWS.map((v) =>
            it(`/${LIBRARY_SLUGS[v.key]}`, v.label, VIEW_ICONS[v.key], isActive(`/${LIBRARY_SLUGS[v.key]}`), counts[v.key]),
          ),
        },
        {
          key: "review",
          label: "Review & publish",
          items: [
            it("/review", isPrimaryOwner ? "Review queue" : "Pending", "review", isActive("/review"), queueCount || undefined, queueCount > 0),
            it("/rework", "Needs rework", "rework", isActive("/rework"), reworkCount || undefined, reworkCount > 0),
            it("/approved", "Approved", "approved", isActive("/approved"), approvedCount || undefined),
            it("/published", "Published", "published", isActive("/published"), publishedCount || undefined),
          ],
        },
        // Content Creator lives at the bottom (an entry point, not daily nav).
        {
          key: "creator",
          items: [it("/create", "Content Creator", "create", isActive("/create"))],
        },
      ],
    },
    {
      key: "tasks",
      label: "Tasks",
      icon: "tasks",
      hot: myTaskCount > 0 || taskReviewCount > 0,
      groups: [
        {
          key: "tasks",
          items: [
            it("/content-overview", "Content Overview", "overview", isActive("/content-overview")),
            it("/tasks", "Tasks board", "tasks", pathname === "/tasks"),
            it("/my-work", "My Work", "mywork", isActive("/my-work"), myTaskCount || undefined, myTaskCount > 0),
            ...(isAdmin ? [it("/tasks/review", "To review", "review", isActive("/tasks/review"), taskReviewCount || undefined, taskReviewCount > 0)] : []),
            it("/analytics", "Analytics", "analytics", isActive("/analytics")),
          ],
        },
      ],
    },
    {
      key: "workspace",
      label: "Workspace",
      icon: "members",
      hot: false,
      groups: [
        {
          key: "workspace",
          items: [
            it("/members", "Members", "members", isActive("/members"), membersCount),
            ...(isAdmin ? [it("/activity", "Activity", "activity", isActive("/activity"))] : []),
            it("/trash", "Trash", "trash", isActive("/trash")),
          ],
        },
      ],
    },
  ];
  const activeArea = AREAS.find((a) => a.groups.some((g) => g.items.some((i) => i.active)))?.key ?? "home";
  const current = AREAS.find((a) => a.key === activeArea)!;
  const activeGroupKey = current.groups.find((g) => g.items.some((i) => i.active))?.key;
  // A labelled group is open if toggled, else when it holds the active item.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (k: string, cur: boolean) => setOpenMap((m) => ({ ...m, [k]: !cur }));
  const areaHref = (a: Area) => a.groups[0].items[0].href;

  return (
    <aside className="group/rail relative flex h-screen w-[62px] shrink-0">
      {/* Area rail — always visible */}
      <div className="z-50 flex h-full w-[62px] shrink-0 flex-col items-center gap-1 border-r border-line/70 bg-gradient-to-b from-card to-bg py-3">
        <div className="mb-2 grid h-8 w-8 place-items-center rounded-[9px] bg-brand-teal text-[13px] text-white shadow-glow-sm">◆</div>
        {AREAS.map((a) => {
          const on = a.key === activeArea;
          return (
            <Link
              key={a.key}
              href={areaHref(a)}
              title={a.label}
              className={`relative flex w-[52px] flex-col items-center gap-0.5 rounded-[10px] py-2 text-[10px] font-semibold transition ${
                on ? "bg-teal-soft text-teal-dark" : "text-slate hover:bg-wash/[0.05] hover:text-ink"
              }`}
            >
              <Icon name={a.icon} size={19} />
              {a.label}
              {a.hot && !on && <span className="absolute right-2.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e0912b]" />}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-2 pt-2">
          <NotificationBell initialUnread={unreadCount} />
          <ThemeToggle />
        </div>
      </div>

      {/* Contextual sidebar — slides in when the rail is hovered/focused */}
      <div className="pointer-events-none fixed left-[62px] top-0 z-40 flex h-screen w-[248px] -translate-x-[112%] flex-col border-r border-line bg-card px-3 pb-5 pt-4 opacity-0 shadow-lift transition-all duration-200 ease-premium group-hover/rail:pointer-events-auto group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:pointer-events-auto group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100">
        <div className="flex items-center gap-2 px-1 pb-3 pt-0.5 font-display text-[14px] font-bold">
          <span className="min-w-0 flex-1 truncate" title={workspaceName}>{workspaceName}</span>
        </div>

        {canUpload && (
          <button
            onClick={() => upload.open()}
            className="btn-premium mb-3 flex items-center justify-center gap-2 rounded-[12px] px-3.5 py-2.5 font-semibold"
          >
            <Icon name="upload" size={17} /> Upload files
          </button>
        )}

        <nav className="-mr-2 flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden overscroll-contain pr-2">
          {current.groups.map((g) => {
            if (!g.label)
              return g.items.map((i) => (
                <NavLink key={i.href} href={i.href} active={i.active} label={i.label} icon={i.icon} count={i.count} hot={i.hot} />
              ));
            const open = openMap[g.key] ?? g.key === activeGroupKey;
            const collapsedHot = !open && g.items.some((i) => i.hot);
            return (
              <div key={g.key}>
                <button
                  onClick={() => toggle(g.key, open)}
                  className="flex w-full items-center gap-1.5 rounded-[8px] px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-slate/80 transition hover:text-ink"
                >
                  <span className={`text-[9px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                  {g.label}
                  {collapsedHot && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#e0912b]" />}
                </button>
                {open &&
                  g.items.map((i) => (
                    <NavLink key={i.href} href={i.href} active={i.active} label={i.label} icon={i.icon} count={i.count} hot={i.hot} />
                  ))}
              </div>
            );
          })}
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
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-[10px] border border-line py-2.5 font-medium text-slate hover:bg-bg hover:text-[#c23b2a]"
          >
            <Icon name="signout" size={16} /> Sign out
          </button>
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
