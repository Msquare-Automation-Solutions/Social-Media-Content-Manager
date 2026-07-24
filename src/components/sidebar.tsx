"use client";

import { useEffect, useState } from "react";
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
  storage: { total: number; active: number; trashed: number };
  storageLimitBytes: number;
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
  storage,
  storageLimitBytes,
}: Props) {
  const pathname = usePathname();
  const upload = useUploadDialog();
  const canUpload = user.role !== "VIEWER";
  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  type Item = { href: string; label: string; icon: IconName; count?: number; hot?: boolean; active: boolean };
  type Group = { key: string; label?: string; collapsible?: boolean; items: Item[] };
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
            it("/dashboard", "Dashboard", "dashboard", isActive("/dashboard")),
            it("/", "Workspace overview", "overview", isActive("/")),
          ],
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
          collapsible: true,
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
    // Workspace (Members, Activity) is admin-only — hidden entirely for others.
    ...(isAdmin
      ? [{
          key: "workspace",
          label: "Workspace",
          icon: "members" as IconName,
          hot: false,
          groups: [
            {
              key: "workspace",
              items: [
                it("/members", "Members", "members", isActive("/members"), membersCount),
                it("/activity", "Activity", "activity", isActive("/activity")),
              ],
            },
          ],
        }]
      : []),
  ];
  const activeArea = AREAS.find((a) => a.groups.some((g) => g.items.some((i) => i.active)))?.key ?? "home";
  const current = AREAS.find((a) => a.key === activeArea)!;
  const areaHref = (a: Area) => a.groups[0].items[0].href;
  // Collapsible groups (e.g. the rarely-used Review & publish) — collapsed by
  // default, open if you toggle them or you're on one of their pages.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (k: string, open: boolean) => setOpenGroups((m) => ({ ...m, [k]: !open }));

  // Rail "new work" dots. Each area has a numeric signal (count of things
  // needing attention). We remember the signal the user last saw (per area, in
  // localStorage) and only show the dot when the signal has GROWN since then —
  // so the dot clears once you've visited the area and never gives a false
  // alarm for work you've already looked at.
  const areaSignals: Record<string, number> = {
    tasks: myTaskCount + taskReviewCount,
    content: queueCount + reworkCount + binCount,
  };
  const [seen, setSeen] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(JSON.parse(localStorage.getItem("railSeen") || "{}"));
    } catch {
      /* ignore */
    }
  }, []);
  // Being on an area counts as seeing it: record its current signal.
  const activeSignal = areaSignals[activeArea];
  useEffect(() => {
    if (activeSignal === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen((prev) => {
      if (prev[activeArea] === activeSignal) return prev;
      const next = { ...prev, [activeArea]: activeSignal };
      try {
        localStorage.setItem("railSeen", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [activeArea, activeSignal]);
  const areaHot = (key: string) => {
    const sig = areaSignals[key];
    if (sig === undefined) return false;
    // Never dot the area you're currently viewing; otherwise dot only if new.
    return key !== activeArea && sig > (seen[key] ?? 0);
  };

  return (
    <aside className="peer/nav group/rail relative flex h-screen w-[62px] shrink-0">
      {/* Area rail, always visible */}
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
              {areaHot(a.key) && <span className="absolute right-2.5 top-1.5 h-2 w-2 rounded-full bg-[#e0912b] ring-2 ring-card" />}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-2 pt-2">
          <NotificationBell initialUnread={unreadCount} />
          <Link
            href="/trash"
            title="Trash"
            className={`grid h-8 w-8 place-items-center rounded-[9px] transition ${
              isActive("/trash") ? "bg-teal-soft text-teal-dark" : "text-slate hover:bg-wash/[0.06] hover:text-ink"
            }`}
          >
            <Icon name="trash" size={17} />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Contextual sidebar, slides in when the rail is hovered/focused */}
      <div className="pointer-events-none fixed left-[62px] top-0 z-40 flex h-screen w-[248px] -translate-x-[112%] flex-col border-r border-line bg-card px-3 pb-5 pt-4 opacity-0 shadow-lift transition-all duration-200 ease-premium group-hover/rail:pointer-events-auto group-hover/rail:translate-x-0 group-hover/rail:opacity-100">
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
            if (g.collapsible) {
              const open = openGroups[g.key] ?? g.items.some((i) => i.active);
              const hot = !open && g.items.some((i) => i.hot);
              return (
                <div key={g.key}>
                  <button
                    onClick={() => toggleGroup(g.key, open)}
                    className="flex w-full items-center gap-1.5 px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-slate/80 transition hover:text-ink"
                  >
                    <span className={`text-[9px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                    {g.label}
                    {hot && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#e0912b]" />}
                  </button>
                  {open && g.items.map((i) => (
                    <NavLink key={i.href} href={i.href} active={i.active} label={i.label} icon={i.icon} count={i.count} hot={i.hot} />
                  ))}
                </div>
              );
            }
            return (
              <div key={g.key}>
                {g.label && (
                  <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-slate/80">
                    {g.label}
                  </div>
                )}
                {g.items.map((i) => (
                  <NavLink key={i.href} href={i.href} active={i.active} label={i.label} icon={i.icon} count={i.count} hot={i.hot} />
                ))}
              </div>
            );
          })}
        </nav>

        <StorageMeter storage={storage} limit={storageLimitBytes} />

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

function fmtBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n < 1e10 ? 2 : 1)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} KB`;
  return `${n} B`;
}

function StorageMeter({ storage, limit }: { storage: { total: number; active: number; trashed: number }; limit: number }) {
  const { total, active, trashed } = storage;
  const pct = limit > 0 ? Math.min(100, (total / limit) * 100) : 0;
  const activePct = limit > 0 ? Math.min(100, (active / limit) * 100) : 0;
  const trashPct = limit > 0 ? Math.min(100 - activePct, (trashed / limit) * 100) : 0;
  // Total usage colour: teal normally, amber past 75%, red past 90%.
  const activeColor = pct >= 90 ? "#d64545" : pct >= 75 ? "#e0912b" : "#0e9f8f";
  return (
    <div className="mt-2 rounded-[11px] border border-line bg-wash/[0.03] px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate">
          <Icon name="upload" size={13} /> Storage
        </span>
        <span className="font-medium text-slate">{Math.round(pct)}%</span>
      </div>
      {/* Two-segment bar: active media, then trashed (still occupying R2). */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-wash/[0.1]">
        <div className="h-full transition-all" style={{ width: `${activePct}%`, background: activeColor }} />
        <div className="h-full transition-all" style={{ width: `${trashPct}%`, background: "#94a3b8" }} />
      </div>
      <div className="mt-1.5 space-y-0.5 text-[10.5px] text-slate">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: activeColor }} /> Media <b className="font-semibold text-ink">{fmtBytes(active)}</b>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: "#94a3b8" }} /> Trash <b className="font-semibold text-ink">{fmtBytes(trashed)}</b>
        </div>
        <div className="pt-0.5">{fmtBytes(total)} of {fmtBytes(limit)} used</div>
      </div>
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
