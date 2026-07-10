// Lightweight, dependency-free charts for the dashboard. Marks follow the
// dataviz specs: thin bars with rounded ends, recessive tracks, a 2px surface
// gap between donut segments, and a direct numeric label on every mark so
// identity/magnitude is never carried by color alone.

import { PlatformIcon } from "@/components/ui/platform-icon";

export function StatTile({
  label,
  value,
  sublabel,
  accent = "#0e9f8f",
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  accent?: string;
}) {
  return (
    <div className="surface card-lift relative overflow-hidden rounded-card p-4">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-slate">
        {label}
      </div>
      <div className="mt-1.5 text-[30px] font-bold leading-none tabular-nums text-ink">
        {value}
      </div>
      {sublabel && <div className="mt-1 text-[11.5px] text-slate">{sublabel}</div>}
    </div>
  );
}

export type BarDatum = { label: string; value: number; color: string; icon?: string };

export function BarChart({ data, empty = "No data yet" }: { data: BarDatum[]; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) {
    return <div className="py-6 text-center text-[12.5px] text-slate">{empty}</div>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="flex w-32 shrink-0 items-center gap-1.5 truncate text-[12px] text-ink">
            {d.icon && (
              <PlatformIcon name={d.label} icon={d.icon} size={14} className="shrink-0" />
            )}
            <span className="truncate">{d.label}</span>
          </div>
          <div className="relative h-2.5 flex-1 rounded-full bg-bg">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-premium"
              style={{
                width: d.value === 0 ? 0 : `${Math.max(4, (d.value / max) * 100)}%`,
                background: d.color,
              }}
            />
          </div>
          <div className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink">
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export type DonutSegment = { label: string; value: number; color: string };

export function Donut({
  segments,
  centerLabel = "total",
  size = 132,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  const cx = 60;
  const gap = total > 0 ? 3 : 0; // 2–3px surface gap between segments
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="By status">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eef1f5" strokeWidth={13} />
          {total > 0 &&
            segments.map((seg) => {
              const frac = seg.value / total;
              const len = Math.max(0, frac * c - gap);
              const dash = `${len} ${c - len}`;
              const offset = -acc * c;
              acc += frac;
              if (seg.value === 0) return null;
              return (
                <circle
                  key={seg.label}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={13}
                  strokeDasharray={dash}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${cx} ${cx})`}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <div className="text-[24px] font-bold leading-none tabular-nums text-ink">{total}</div>
          <div className="text-[10.5px] text-slate">{centerLabel}</div>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-[12.5px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: seg.color }}
              aria-hidden
            />
            <span className="text-slate">{seg.label}</span>
            <span className="font-semibold tabular-nums text-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Reserved status palette (kept distinct from platform/series hues).
export const STATUS_COLORS: Record<string, string> = {
  PENDING: "#e0912b",
  REWORK: "#c23b2a",
  APPROVED: "#0e9f8f",
  PUBLISHED: "#3f63d0",
};
