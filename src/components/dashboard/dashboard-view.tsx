"use client";

import Link from "next/link";
import type { DashboardData } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/enums";
import { initials } from "@/lib/colors";
import {
  StatTile,
  BarChart,
  Donut,
  STATUS_COLORS,
  type BarDatum,
} from "@/components/dashboard/charts";
import { PlatformCarousel } from "@/components/dashboard/platform-carousel";

export function DashboardView({ data }: { data: DashboardData }) {
  const platformBars: BarDatum[] = data.perPlatform.map((p) => ({
    label: p.name,
    value: p.total,
    color: p.color,
    icon: p.icon,
  }));

  const typeBars: BarDatum[] = data.byType.map((t) => ({
    label: t.label,
    value: t.count,
    color: "#0e9f8f", // magnitude → single sequential hue
  }));

  const maxCreator = Math.max(1, ...data.topCreators.map((c) => c.assetCount));

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">Dashboard</h2>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile
          label="Scheduled this month"
          value={data.scheduledThisMonth}
          sublabel="Posts going out"
          accent="#7a4fc9"
        />
        <StatTile
          label={STATUS_LABELS.IN_QUEUE}
          value={data.statusCounts.IN_QUEUE}
          sublabel="Awaiting review"
          accent={STATUS_COLORS.IN_QUEUE}
        />
        <StatTile
          label={STATUS_LABELS.REWORK}
          value={data.statusCounts.REWORK}
          sublabel="Needs changes"
          accent={STATUS_COLORS.REWORK}
        />
        <StatTile
          label={STATUS_LABELS.APPROVED}
          value={data.statusCounts.APPROVED}
          sublabel={`of ${data.totalAssets} total`}
          accent={STATUS_COLORS.APPROVED}
        />
      </div>

      {/* Per-platform overview + carousel */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface rounded-card p-5">
          <h3 className="mb-3 font-display text-[15px]">Media files per platform</h3>
          <BarChart data={platformBars} empty="No platforms tagged yet" />
        </section>
        <section>
          <h3 className="mb-3 font-display text-[15px]">Platform spotlight</h3>
          <PlatformCarousel platforms={data.perPlatform} />
        </section>
      </div>

      {/* Breakdowns */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface rounded-card p-5">
          <h3 className="mb-3 font-display text-[15px]">By type</h3>
          <BarChart data={typeBars} empty="No assets yet" />
        </section>
        <section className="surface rounded-card p-5">
          <h3 className="mb-3 font-display text-[15px]">By status</h3>
          <Donut
            centerLabel="assets"
            segments={(["APPROVED", "IN_QUEUE", "REWORK"] as const).map((s) => ({
              label: STATUS_LABELS[s],
              value: data.statusCounts[s],
              color: STATUS_COLORS[s],
            }))}
          />
        </section>
      </div>

      {/* Upcoming + creators */}
      <div className="mt-4 grid gap-4 pb-16 lg:grid-cols-2">
        <section className="surface rounded-card p-5">
          <h3 className="mb-3 font-display text-[15px]">Upcoming posts</h3>
          {data.upcoming.length === 0 ? (
            <div className="py-6 text-center text-[12.5px] text-slate">
              Nothing scheduled ahead — add post dates in the save dialog.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line/70">
              {data.upcoming.map((u, i) => (
                <li key={`${u.id}-${i}`} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] text-[13px] text-white"
                    style={{ background: u.platformColor }}
                    aria-hidden
                  >
                    {u.platformIcon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-ink">{u.title}</div>
                    <div className="text-[11px] text-slate">{u.platformName}</div>
                  </div>
                  <time className="shrink-0 rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-semibold text-teal-dark">
                    {new Date(u.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
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
