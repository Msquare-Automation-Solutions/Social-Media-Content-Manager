"use client";

// Small "Select all" toggle shown above a selectable grid. Reflects none /
// partial / all state and flips between select-all and clear.
export function SelectAllBar({
  total,
  selectedCount,
  onSelectAll,
  onClear,
}: {
  total: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  if (total === 0) return null;
  const all = selectedCount === total;
  const some = selectedCount > 0 && !all;

  return (
    <button
      onClick={all ? onClear : onSelectAll}
      className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-slate transition hover:text-ink"
    >
      <span
        className={`grid h-[18px] w-[18px] place-items-center rounded-[6px] border transition ${
          all || some ? "border-teal bg-teal text-white" : "border-line bg-card"
        }`}
      >
        {all && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
        {some && <span className="h-[2.5px] w-[9px] rounded-full bg-white" />}
      </span>
      {all ? "Deselect all" : "Select all"}
      {selectedCount > 0 && (
        <span className="font-normal text-slate">
          · {selectedCount} of {total} selected
        </span>
      )}
    </button>
  );
}
