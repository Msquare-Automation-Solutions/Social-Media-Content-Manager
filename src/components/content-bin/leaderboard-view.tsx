"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { LeaderboardRow } from "@/lib/data";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardView({
  rows,
  meId,
  month,
  monthLabel,
}: {
  rows: LeaderboardRow[];
  meId: string;
  /** "YYYY-MM", or "" for all time. */
  month: string;
  monthLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const setPeriod = (value: string) =>
    start(() => router.replace(value ? `${pathname}?month=${value}` : `${pathname}?month=all`));

  const total = rows.reduce((n, r) => n + r.count, 0);
  const mine = rows.find((r) => r.userId === meId);

  const tab = (active: boolean) =>
    `rounded-[9px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
      active ? "bg-teal text-white" : "border border-line text-slate hover:border-teal"
    }`;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <h2 className="font-display text-[19px]">Leaderboard</h2>
        {pending && <span className="text-[12px] text-slate">Updating…</span>}
      </div>
      <p className="mb-4 max-w-[74ch] text-[13px] text-slate">
        Who&apos;s captured the most ideas in the Content Bin. Ideas that were discarded don&apos;t
        count.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button onClick={() => setPeriod(currentMonth())} className={tab(Boolean(month))}>
          {monthLabel}
        </button>
        <button onClick={() => setPeriod("")} className={tab(!month)}>
          All time
        </button>
        <span className="ml-1 text-[12px] text-slate">
          {total} {total === 1 ? "idea" : "ideas"} from {rows.length}{" "}
          {rows.length === 1 ? "person" : "people"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-card px-5 py-10 text-center text-[13px] text-slate shadow-soft">
          No ideas captured {month ? "this month" : "yet"} — be the first.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
          {rows.map((r) => {
            const isMe = r.userId === meId;
            return (
              <div
                key={r.userId}
                className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
                  isMe ? "bg-teal-soft/60" : ""
                }`}
              >
                <span className="w-8 shrink-0 text-center text-[15px] font-bold text-slate">
                  {r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}
                </span>
                <Avatar name={r.name} color={r.avatarColor} url={r.avatarUrl} size={30} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">
                  {r.name}
                  {isMe && <span className="ml-2 text-[11.5px] font-normal text-teal-dark">you</span>}
                </span>
                <span className="shrink-0 text-[14px] font-bold text-ink">{r.count}</span>
                <span className="shrink-0 text-[11.5px] text-slate">
                  {r.count === 1 ? "idea" : "ideas"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {mine && (
        <p className="mt-3 text-[12.5px] text-slate">
          You&apos;re {ordinal(mine.rank)} with {mine.count} {mine.count === 1 ? "idea" : "ideas"}.
        </p>
      )}
    </div>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
