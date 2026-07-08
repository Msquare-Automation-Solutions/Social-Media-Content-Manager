import Link from "next/link";

export const dynamic = "force-dynamic";

// Phase 6 replaces this with the Trash view (restore within 30 days).
export default function TrashPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">🗑 Trash</h2>
      </div>
      <div className="grid place-items-center rounded-card border border-dashed border-line py-20 text-slate">
        Trash + restore arrives in Phase 6.
      </div>
    </div>
  );
}
