"use client";

import { useRouter, usePathname } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import type { DashboardData } from "@/lib/data";
import { initials } from "@/lib/colors";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { StatTile } from "@/components/dashboard/charts";

export function DashboardView({
  data,
  from,
  to,
}: {
  data: DashboardData;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const setRange = (key: "from" | "to", value: string) => {
    const params = new URLSearchParams({ from, to });
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const maxCreator = Math.max(1, ...data.topCreators.map((c) => c.assetCount));

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Dashboard</h2>
        <div className="ml-auto flex items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setRange("from", e.target.value)}
              className="rounded-[10px] border border-line bg-card px-2.5 py-1.5 text-[12.5px] font-normal text-ink outline-none focus:border-teal"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setRange("to", e.target.value)}
              className="rounded-[10px] border border-line bg-card px-2.5 py-1.5 text-[12.5px] font-normal text-ink outline-none focus:border-teal"
            />
          </label>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="In progress"
          value={data.taskCounts.inProgress}
          sublabel="Being produced"
          accent="#3f8fd0"
          href="/tasks"
        />
        <StatTile
          label="To review"
          value={data.taskCounts.toReview}
          sublabel="Awaiting review"
          accent="#c98a12"
          href="/tasks/review"
        />
        <StatTile
          label="In rework"
          value={data.taskCounts.inRework}
          sublabel="Sent back"
          accent="#c23b2a"
          href="/tasks/rework"
        />
        <StatTile
          label="Approved"
          value={data.taskCounts.ready}
          sublabel="All stages approved"
          accent="#7a4fc9"
          href="/tasks/ready"
        />
        <StatTile
          label="Published"
          value={data.taskCounts.published}
          sublabel={`of ${data.totalTasks} tasks`}
          accent="#2e9e6b"
          href="/tasks/published"
        />
      </div>

      {/* Latest posts + creators */}
      <div className="mt-4 grid gap-4 pb-16 lg:grid-cols-2">
        <section className="surface rounded-card p-5">
          <h3 className="mb-3 font-display text-[15px]">Latest posts</h3>
          {data.latest.length === 0 ? (
            <div className="py-6 text-center text-[12.5px] text-slate">
              Nothing published yet.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line/70">
              {data.latest.map((u, i) => (
                <li key={`${u.id}-${i}`} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] text-white"
                    style={{ background: u.platformColor }}
                  >
                    <PlatformIcon name={u.platformName} icon={u.platformIcon} size={15} mono />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-ink">{u.title}</div>
                    <div className="truncate text-[11px] text-slate">
                      {u.accountName ? `${u.accountName} · ` : ""}{u.platformName}
                    </div>
                  </div>
                  <time className="shrink-0 rounded-full bg-[#d7f2e5] px-2 py-0.5 text-[11px] font-semibold text-[#2e9e6b]">
                    {u.date
                      ? new Date(u.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : "—"}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface rounded-card p-5">
          <h3 className="mb-3 font-display text-[15px]">Top creators</h3>
          {data.topCreators.length === 0 ? (
            <div className="py-6 text-center text-[12.5px] text-slate">No creators with assets yet.</div>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topCreators.map((c) => (
                <li key={c.name} className="flex items-center gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-soft"
                    style={{ background: c.avatarColor }}
                  >
                    {initials(c.name)}
                  </span>
                  <span className="w-24 shrink-0 truncate text-[12.5px] font-medium text-ink">
                    {c.name}
                  </span>
                  <div className="relative h-2.5 flex-1 rounded-full bg-bg">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(6, (c.assetCount / maxCreator) * 100)}%`,
                        background: c.avatarColor,
                      }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink">
                    {c.assetCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
