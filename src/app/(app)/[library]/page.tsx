import Link from "next/link";
import { notFound } from "next/navigation";
import { SLUG_TO_VIEW, LIBRARY_VIEWS } from "@/lib/library";

export const dynamic = "force-dynamic";

// Phase 4 replaces this with the real filterable grid + asset drawer.
export default function LibraryPlaceholder({
  params,
}: {
  params: { library: string };
}) {
  const view = SLUG_TO_VIEW[params.library];
  if (!view) notFound();
  const meta = LIBRARY_VIEWS.find((v) => v.key === view)!;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-4 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">
          {meta.icon} {meta.label}
        </h2>
      </div>
      <div className="grid place-items-center rounded-card border border-dashed border-line py-20 text-slate">
        The {meta.label} grid (filters, cards, drawer) arrives in Phase 4.
      </div>
    </div>
  );
}
