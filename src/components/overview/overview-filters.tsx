"use client";

import { useRouter, usePathname } from "next/navigation";
import { ASSET_STATUSES, STATUS_LABELS } from "@/lib/enums";

// Status + date-range filter bar for the workspace tree. Persists to the URL so
// the server re-queries getWorkspaceOverview.
export function OverviewFilters({
  filters,
}: {
  filters: { status: string; from: string; to: string };
}) {
  const router = useRouter();
  const pathname = usePathname();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams({
      ...(filters.status && { status: filters.status }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    });
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const field = "rounded-[10px] border border-line bg-card px-2.5 py-2 text-[12.5px] outline-none focus:border-teal";

  return (
    <div className="mb-5 flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        Status
        <select
          value={filters.status}
          onChange={(e) => setParam("status", e.target.value)}
          className={`${field} font-normal text-ink`}
        >
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        From
        <input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => setParam("from", e.target.value)}
          className={`${field} font-normal text-ink`}
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate">
        To
        <input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => setParam("to", e.target.value)}
          className={`${field} font-normal text-ink`}
        />
      </label>
      {(filters.status || filters.from || filters.to) && (
        <button
          onClick={() => router.push(pathname)}
          className="self-end px-1 py-2 text-[12px] font-semibold text-teal-dark"
        >
          Clear
        </button>
      )}
    </div>
  );
}
