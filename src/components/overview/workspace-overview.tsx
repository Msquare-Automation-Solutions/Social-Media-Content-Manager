import Link from "next/link";
import type { WorkspaceOverview as Overview, OverviewCategory } from "@/lib/data";
import { TYPE_ICONS } from "@/lib/library";
import { gradientFor } from "@/lib/artifact-view";
import { PlatformIcon } from "@/components/ui/platform-icon";

// A bird's-eye map of the workspace: one section per social platform, each with
// a card for the four content types (count + a strip of mini previews +
// "View all" into the filtered library).
export function WorkspaceOverview({ overview }: { overview: Overview }) {
  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <Link href="/" className="text-[13px] font-semibold text-teal-dark">
          ← Back to chat
        </Link>
        <h2 className="font-display text-[19px]">Workspace overview</h2>
        {overview.total > 0 && (
          <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[12px] font-bold text-teal-dark tabular-nums">
            {overview.total}
          </span>
        )}
      </div>
      <p className="mb-5 text-[13px] text-slate">
        Everything in the workspace, organised by platform and content type.
      </p>

      {overview.groups.length === 0 ? (
        <div className="grid place-items-center py-20 text-center text-slate">
          Nothing here yet — save or upload content and tag it to a platform.
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-24">
          {overview.groups.map((g) => (
            <section key={g.id}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white shadow-soft"
                  style={{ background: g.color }}
                >
                  <PlatformIcon name={g.name} icon={g.icon} size={17} mono />
                </span>
                <h3 className="font-display text-[16px]">{g.name}</h3>
                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold text-slate tabular-nums">
                  {g.count} {g.count === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
                {g.categories.map((cat) => (
                  <CategoryCard key={cat.key} channelId={g.id} cat={cat} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ channelId, cat }: { channelId: string; cat: OverviewCategory }) {
  const viewAllHref =
    channelId === "unassigned"
      ? `/${cat.slug}`
      : `/${cat.slug}?channel=${encodeURIComponent(channelId)}`;

  return (
    <div className="surface flex flex-col rounded-card border border-line/70 p-3.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-[15px]">
          {TYPE_ICONS[cat.key] ?? "📄"}
        </span>
        <span className="text-[13px] font-semibold">{cat.label}</span>
        <span className="ml-auto rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-bold text-teal-dark tabular-nums">
          {cat.count}
        </span>
      </div>

      {cat.previews.length > 0 ? (
        <div className="mt-3 flex gap-1.5">
          {cat.previews.map((p) => (
            <MiniPreview key={p.id} title={p.title} type={p.type} thumbnailUrl={p.thumbnailUrl} />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid h-[52px] place-items-center rounded-[9px] bg-bg text-[11.5px] text-slate">
          None yet
        </div>
      )}

      {cat.count > 0 && (
        <Link
          href={viewAllHref}
          className="mt-3 text-[12px] font-semibold text-teal-dark hover:underline"
        >
          View all →
        </Link>
      )}
    </div>
  );
}

function MiniPreview({
  title,
  type,
  thumbnailUrl,
}: {
  title: string;
  type: string;
  thumbnailUrl: string | null;
}) {
  if (thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumbnailUrl}
        alt={title}
        title={title}
        className="h-[52px] w-[52px] shrink-0 rounded-[9px] object-cover"
      />
    );
  }
  const [c1, c2] = gradientFor(title);
  return (
    <div
      title={title}
      className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[9px] text-[15px]"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <span>{TYPE_ICONS[type] ?? "📄"}</span>
    </div>
  );
}
