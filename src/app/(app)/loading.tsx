// Instant loading skeleton for every (app) page navigation. Next renders this
// the moment a link is clicked (the sidebar/layout stays put), so switching
// tabs feels immediate instead of waiting on the server round-trip.
export default function Loading() {
  return (
    <div className="flex-1 overflow-hidden px-7 py-6" aria-hidden>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-7 w-40 animate-pulse rounded-[9px] bg-wash/[0.07]" />
        <div className="h-5 w-10 animate-pulse rounded-full bg-wash/[0.06]" />
      </div>
      <div className="mb-6 h-4 w-[52ch] max-w-full animate-pulse rounded bg-wash/[0.05]" />
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-40 w-[215px] flex-1 animate-pulse rounded-card border border-line/60 bg-wash/[0.04]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
