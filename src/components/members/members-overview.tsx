"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { BackButton } from "@/components/ui/back-button";
import { initials } from "@/lib/colors";
import type { MemberOverviewRow } from "@/lib/data";

type StatusFilter = "" | "onTime" | "delay";

export function MembersOverview({
  rows,
  filters,
}: {
  rows: MemberOverviewRow[];
  filters: { from: string; to: string; status: StatusFilter };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function setParam(key: string, value: string) {
    const q = new URLSearchParams(sp.toString());
    if (value) q.set(key, value);
    else q.delete(key);
    start(() => router.replace(`${pathname}?${q.toString()}`));
  }

  const input =
    "rounded-[10px] border border-line bg-card px-3 py-2 text-[13px] text-ink outline-none focus:border-teal";

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Members overview</h2>
        {pending && <span className="text-[12px] text-slate">Updating…</span>}
      </div>
      <p className="mb-4 max-w-[74ch] text-[13px] text-slate">
        Each member’s workload over the selected dates — total stages assigned, and how many
        they completed on time vs. delayed.
      </p>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <label className="text-[11.5px] font-semibold text-slate">
          From
          <input type="date" value={filters.from} onChange={(e) => setParam("from", e.target.value)} className={input + " mt-1 block font-normal"} />
        </label>
        <label className="text-[11.5px] font-semibold text-slate">
          To
          <input type="date" value={filters.to} onChange={(e) => setParam("to", e.target.value)} className={input + " mt-1 block font-normal"} />
        </label>
        <label className="text-[11.5px] font-semibold text-slate">
          Highlight status
          <select value={filters.status} onChange={(e) => setParam("status", e.target.value)} className={input + " mt-1 block font-normal"}>
            <option value="">All statuses</option>
            <option value="onTime">Completed, on time</option>
            <option value="delay">Completed, delayed</option>
          </select>
        </label>
        {(filters.from || filters.to || filters.status) && (
          <button
            onClick={() => start(() => router.replace(pathname))}
            className="rounded-[10px] border border-line px-3 py-2 text-[12.5px] font-semibold text-slate hover:border-teal"
          >
            Clear
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center py-20 text-[13px] text-slate">No members yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <div key={m.userId} className="rounded-card border border-line bg-card p-4 shadow-soft">
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full text-[12px] font-bold text-white"
                  style={{ background: m.avatarColor }}
                >
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <b className="block truncate text-[13.5px]">{m.name}</b>
                  <span className="block truncate text-[11px] text-slate">{m.role}</span>
                </div>
                <span className="ml-auto text-right">
                  <span className="block font-display text-[22px] font-bold leading-none">{m.total}</span>
                  <span className="block text-[10.5px] text-slate">assigned</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <Stat label="Completed, on time" value={m.completedOnTime} tone="good" active={filters.status === "onTime"} />
                <Stat label="Completed, delayed" value={m.completedDelay} tone="warn" active={filters.status === "delay"} />
                <Stat label="In progress" value={m.inProgress} tone="neutral" />
                <Stat label="Not started" value={m.notStarted} tone="neutral" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone, active = false }: { label: string; value: number; tone: "good" | "warn" | "neutral"; active?: boolean }) {
  const color = tone === "good" ? "#2e9e6b" : tone === "warn" ? "#c98a1e" : undefined;
  return (
    <div className={`rounded-[10px] border px-2.5 py-2 ${active ? "border-teal bg-teal-soft/40" : "border-line bg-wash/[0.02]"}`}>
      <div className="font-display text-[16px] font-bold" style={color ? { color } : undefined}>{value}</div>
      <div className="text-[10.5px] leading-tight text-slate">{label}</div>
    </div>
  );
}
