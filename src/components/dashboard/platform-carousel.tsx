"use client";

import { useEffect, useState } from "react";
import type { PlatformSlice } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/enums";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { BarChart, STATUS_COLORS, type BarDatum } from "@/components/dashboard/charts";

// One platform per slide with its own breakdown. Auto-advances every 5s
// (pauses on hover/focus), with manual ‹ › buttons and clickable dots.
export function PlatformCarousel({ platforms }: { platforms: PlatformSlice[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = platforms.length;

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [paused, count]);

  if (count === 0) {
    return (
      <div className="py-6 text-center text-[13px] text-slate">
        No platforms yet, add one from the save dialog.
      </div>
    );
  }

  const go = (n: number) => setIndex(((n % count) + count) % count);
  const p = platforms[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white shadow-soft"
            style={{ background: p.color }}
          >
            <PlatformIcon name={p.name} icon={p.icon} size={19} mono />
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-[16px] leading-tight">{p.name}</div>
            <div className="text-[11.5px] text-slate">
              {p.total} {p.total === 1 ? "item" : "items"} · {p.scheduledThisMonth} this month
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <CarouselButton label="Previous platform" onClick={() => go(index - 1)}>
            ‹
          </CarouselButton>
          <span className="tabular-nums text-[11.5px] text-slate">
            {index + 1}/{count}
          </span>
          <CarouselButton label="Next platform" onClick={() => go(index + 1)}>
            ›
          </CarouselButton>
        </div>
      </div>

      <div key={p.id} className="animate-fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate">
          By type
        </div>
        <div className="mt-2">
          <BarChart
            empty="Nothing tagged to this platform yet"
            data={p.byType.map<BarDatum>((t) => ({
              label: t.label,
              value: t.count,
              color: p.color,
            }))}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["PENDING", "REWORK", "APPROVED", "PUBLISHED"] as const).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-[11.5px] font-medium text-ink"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLORS[s] }}
                aria-hidden
              />
              {STATUS_LABELS[s]}
              <b className="tabular-nums">{p.byStatus[s]}</b>
            </span>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {platforms.map((pl, i) => (
            <button
              key={pl.id}
              onClick={() => go(i)}
              aria-label={`Show ${pl.name}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-teal" : "w-1.5 bg-line hover:bg-slate/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-full border border-line bg-card text-[16px] leading-none text-slate transition hover:border-teal hover:text-teal-dark"
    >
      {children}
    </button>
  );
}
