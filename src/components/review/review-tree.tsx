"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReviewQueue } from "@/lib/data";
import { TYPE_ICONS } from "@/lib/library";
import { initials } from "@/lib/colors";
import { AssetPreview } from "@/components/library/asset-card";
import { AssetDrawer } from "@/components/library/asset-drawer";

// Platform → Category → item tree of everything awaiting approval. Clicking an
// item opens the shared AssetDrawer (preview + Approve / Request rework for
// admins). Approving/reworking moves it out of IN_QUEUE, so a router.refresh()
// drops it from the tree.
export function ReviewTree({
  queue,
  canEdit,
  canReview,
}: {
  queue: ReviewQueue;
  canEdit: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // First platform expanded by default; categories keyed as `${groupId}/${key}`.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(queue.groups[0] ? [queue.groups[0].id] : []),
  );
  const [openCats, setOpenCats] = useState<Set<string>>(() => {
    const first = queue.groups[0];
    const firstCat = first?.categories[0];
    return new Set(first && firstCat ? [`${first.id}/${firstCat.key}`] : []);
  });

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">Review queue</h2>
        {queue.total > 0 && (
          <span className="rounded-full bg-[#fdeeda] px-2.5 py-0.5 text-[12px] font-bold text-[#b07514] tabular-nums">
            {queue.total} waiting
          </span>
        )}
      </div>
      <p className="mb-5 text-[13px] text-slate">
        Everything awaiting approval, grouped by platform. Open an item to preview it, then
        {canReview ? " approve or send it back for rework." : " see its review status."}
      </p>

      {queue.groups.length === 0 ? (
        <div className="grid place-items-center rounded-card border border-dashed border-line py-20 text-center text-slate">
          🎉 Queue&rsquo;s clear — nothing waiting for review.
        </div>
      ) : (
        <div className="flex max-w-[840px] flex-col gap-3">
          {queue.groups.map((g) => {
            const gOpen = openGroups.has(g.id);
            return (
              <div
                key={g.id}
                className="overflow-hidden rounded-card border border-line bg-card shadow-soft"
              >
                <button
                  onClick={() => toggle(openGroups, g.id, setOpenGroups)}
                  aria-expanded={gOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#fbfcfd]"
                >
                  <Chevron open={gOpen} />
                  <span
                    className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] text-[17px] text-white shadow-soft"
                    style={{ background: g.color }}
                    aria-hidden
                  >
                    {g.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{g.name}</span>
                    <span className="block text-[12px] text-slate">
                      {g.count} {g.count === 1 ? "item" : "items"} in queue
                      {g.id === "unassigned" ? " · no platform picked yet" : ""}
                    </span>
                  </span>
                  <span className="ml-auto rounded-full bg-bg px-2.5 py-0.5 text-[12px] font-bold text-slate tabular-nums">
                    {g.count}
                  </span>
                </button>

                {gOpen && (
                  <div className="px-2.5 pb-2">
                    {g.categories.map((cat) => {
                      const catKey = `${g.id}/${cat.key}`;
                      const cOpen = openCats.has(catKey);
                      return (
                        <div key={cat.key} className="border-t border-line/70">
                          <button
                            onClick={() => toggle(openCats, catKey, setOpenCats)}
                            aria-expanded={cOpen}
                            className="flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-left transition hover:bg-[#f7f9fb]"
                          >
                            <Chevron open={cOpen} small />
                            <span className="w-[22px] text-center text-[15px]" aria-hidden>
                              {TYPE_ICONS[cat.key] ?? "📄"}
                            </span>
                            <span className="font-semibold text-[13.5px]">{cat.label}</span>
                            <span className="ml-auto rounded-full bg-bg px-2 py-0.5 text-[11.5px] font-bold text-slate tabular-nums">
                              {cat.count}
                            </span>
                          </button>

                          {cOpen && (
                            <ul className="flex flex-col gap-1.5 pb-2.5 pl-10 pr-1">
                              {cat.assets.map((a) => (
                                <li key={a.id}>
                                  <button
                                    onClick={() => setSelectedId(a.id)}
                                    className="group flex w-full items-center gap-3 rounded-[11px] border border-transparent px-2.5 py-2 text-left transition hover:-translate-y-px hover:border-line hover:bg-white hover:shadow-soft"
                                  >
                                    <span className="h-8 w-11 shrink-0 overflow-hidden rounded-[8px] shadow-soft">
                                      <AssetPreview asset={a} className="h-8" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-[13.5px] font-semibold">
                                        {a.title}
                                      </span>
                                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate">
                                        <span
                                          className="grid h-[15px] w-[15px] place-items-center rounded-full text-[8px] font-bold text-white"
                                          style={{ background: a.person.avatarColor }}
                                        >
                                          {initials(a.person.name)}
                                        </span>
                                        {a.person.name}
                                        <span className="h-[3px] w-[3px] rounded-full bg-[#9aa7b6]" />
                                        {sourceLabel(a.source)}
                                      </span>
                                    </span>
                                    <span className="ml-auto shrink-0 text-[12px] font-semibold text-[#9aa7b6] group-hover:text-teal-dark">
                                      view ›
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedId && (
        <AssetDrawer
          assetId={selectedId}
          canEdit={canEdit}
          canReview={canReview}
          onClose={() => setSelectedId(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  const s = small ? 16 : 18;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-[#9aa7b6] transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function sourceLabel(source: string): string {
  return source === "GENERATED" ? "AI generated" : source === "LINK" ? "External link" : "Upload";
}
