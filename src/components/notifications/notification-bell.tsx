"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icons";
import { initials } from "@/lib/colors";

type NotificationRow = {
  id: string;
  actorName: string;
  actorAvatarColor: string;
  action: string;
  message: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  readAt: string | null;
  createdAt: string;
};

type Feed = { rows: NotificationRow[]; nextCursor: string | null; unread: number };

// Where a notification takes you when clicked, the gallery its status lives in,
// with the specific asset's drawer opened via ?asset=<id>.
function hrefFor(action: string, targetId: string | null): string | null {
  // Task notifications: assign/rework land the assignee in My Work; submit lands
  // the admin in the review queue. Deep-link the specific task via ?task=<id>.
  if (action.startsWith("task.")) {
    const base = action === "task.submitted" ? "/tasks/review" : "/my-work";
    return targetId ? `${base}?task=${encodeURIComponent(targetId)}` : base;
  }
  const base =
    action === "asset.approved"
      ? "/approved"
      : action === "asset.published"
        ? "/published"
        : action === "asset.reworked"
          ? "/rework"
          : null;
  if (!base) return null;
  return targetId ? `${base}?asset=${encodeURIComponent(targetId)}` : base;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  // Close the panel whenever the route changes (e.g. a notification navigated us).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const { data } = useQuery<Feed>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await fetch("/api/notifications");
      if (!r.ok) throw new Error("Failed to load notifications");
      return r.json();
    },
    // Fallback poll only, real-time delivery comes from the SSE stream below.
    refetchInterval: 60_000,
    initialData: { rows: [], nextCursor: null, unread: initialUnread },
  });

  // Real-time: subscribe to the notification stream; any change signal makes
  // react-query refetch the feed immediately. EventSource reconnects on drop.
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = () => qc.invalidateQueries({ queryKey: ["notifications"] });
    return () => es.close();
  }, [qc]);

  const unread = data?.unread ?? 0;
  const rows = useMemo(() => data?.rows ?? [], [data]);

  // Desktop (OS) notifications, poll-driven. `perm` tracks browser permission;
  // `lastTopId` remembers the newest notification we've already seen so we only
  // fire the OS toast for genuinely new arrivals (never on first load).
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const lastTopId = useRef<string | null>(null);

  useEffect(() => {
    // Read the browser permission once mounted (unavailable during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPerm("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    const prevTop = lastTopId.current;
    // First real feed: record the baseline without notifying.
    if (prevTop === null) {
      lastTopId.current = rows[0].id;
      return;
    }
    if (rows[0].id === prevTop) return;
    const idx = rows.findIndex((r) => r.id === prevTop);
    const fresh = idx === -1 ? rows.slice(0, 5) : rows.slice(0, idx);
    lastTopId.current = rows[0].id;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    for (const n of fresh.slice(0, 3)) {
      try {
        const notif = new Notification(n.actorName, { body: n.message, tag: n.id });
        notif.onclick = () => {
          window.focus();
          const href = hrefFor(n.action, n.targetId);
          if (href) router.push(href);
          notif.close();
        };
      } catch {
        // Some environments disallow the constructor, the in-app bell still shows it.
      }
    }
  }, [rows, router]);

  async function enableDesktopAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const res = await Notification.requestPermission();
    setPerm(res);
  }

  // Fire a sample OS notification so the user can verify delivery end-to-end.
  // If this doesn't show, the block is at the OS level (System Settings →
  // Notifications → browser, or an active Focus/Do Not Disturb).
  function testDesktopAlert() {
    try {
      new Notification("MediaChat", {
        body: "Test, desktop alerts are working ✓",
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    if (unread === 0) return;
    await fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function clearAll() {
    // Optimistically empty the feed, then delete server-side.
    qc.setQueryData<Feed>(["notifications"], { rows: [], nextCursor: null, unread: 0 });
    lastTopId.current = null;
    await fetch("/api/notifications", { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      // Opening the panel marks everything read (mirrors typical bell UX).
      await markAllRead();
    }
  }

  function onRowClick(n: NotificationRow) {
    const href = hrefFor(n.action, n.targetId);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openPanel}
        aria-label="Notifications"
        className="relative grid h-8 w-8 place-items-center rounded-[9px] text-slate transition hover:bg-wash/[0.06] hover:text-ink"
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#c23b2a] px-1 text-[10px] font-bold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-0 left-[calc(100%+10px)] z-[60] w-[330px] max-w-[calc(100vw-5rem)] rounded-[14px] border border-line bg-card shadow-lift">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <b className="text-[13px]">Notifications</b>
            {perm === "default" && (
              <button
                onClick={enableDesktopAlerts}
                className="text-[11px] font-semibold text-teal-dark hover:underline"
              >
                Enable desktop alerts
              </button>
            )}
            {perm === "granted" && (
              <span className="flex items-center gap-2 text-[11px] text-slate">
                Desktop alerts on
                <button
                  onClick={testDesktopAlert}
                  className="font-semibold text-teal-dark hover:underline"
                >
                  Test
                </button>
              </span>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-slate">
                Nothing yet, approvals, reworks and publishes show up here.
              </div>
            ) : (
              <ul className="flex flex-col">
                {rows.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => onRowClick(n)}
                      className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-wash/[0.04] ${
                        n.readAt ? "" : "bg-teal-soft/40"
                      }`}
                    >
                      <span
                        className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
                        style={{ background: n.actorAvatarColor }}
                      >
                        {initials(n.actorName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] leading-snug text-ink">
                          <b>{n.actorName}</b> {n.message}
                        </span>
                        <span
                          className="text-[11px] text-slate"
                          suppressHydrationWarning
                        >
                          {relTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {rows.length > 0 && (
            <div className="border-t border-line px-4 py-2 text-right">
              <button onClick={clearAll} className="text-[11.5px] font-semibold text-slate hover:text-[#c23b2a]">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
