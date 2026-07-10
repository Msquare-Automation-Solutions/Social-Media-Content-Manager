"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

// Where a notification takes you when clicked — the gallery its status lives in,
// with the specific asset's drawer opened via ?asset=<id>.
function hrefFor(action: string, targetId: string | null): string | null {
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
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<Feed>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await fetch("/api/notifications");
      if (!r.ok) throw new Error("Failed to load notifications");
      return r.json();
    },
    refetchInterval: 45_000,
    initialData: { rows: [], nextCursor: null, unread: initialUnread },
  });

  const unread = data?.unread ?? 0;
  const rows = data?.rows ?? [];

  // Desktop (OS) notifications — poll-driven. `perm` tracks browser permission;
  // `lastTopId` remembers the newest notification we've already seen so we only
  // fire the OS toast for genuinely new arrivals (never on first load).
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const lastTopId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPerm("unsupported");
      return;
    }
    setPerm(Notification.permission);
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
      const notif = new Notification(n.actorName, { body: n.message, tag: n.id });
      notif.onclick = () => {
        window.focus();
        const href = hrefFor(n.action, n.targetId);
        if (href) router.push(href);
        notif.close();
      };
    }
  }, [rows, router]);

  async function enableDesktopAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const res = await Notification.requestPermission();
    setPerm(res);
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
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
        className="relative grid h-8 w-8 place-items-center rounded-[9px] text-slate transition hover:bg-black/[0.05] hover:text-ink"
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#c23b2a] px-1 text-[10px] font-bold text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-[14px] border border-line bg-card shadow-card">
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
              <span className="text-[11px] text-slate">Desktop alerts on</span>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12.5px] text-slate">
                Nothing yet — approvals, reworks and publishes show up here.
              </div>
            ) : (
              <ul className="flex flex-col">
                {rows.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => onRowClick(n)}
                      className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-black/[0.03] ${
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
