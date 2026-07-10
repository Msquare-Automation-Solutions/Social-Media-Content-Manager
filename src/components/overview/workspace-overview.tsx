import Link from "next/link";
import type {
  WorkspaceOverview as Overview,
  OverviewGroup,
  OverviewCategory,
  OverviewRecent,
} from "@/lib/data";
import { TYPE_ICONS, TYPE_LABELS, LIBRARY_SLUGS } from "@/lib/library";
import { gradientFor } from "@/lib/artifact-view";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { StatusBadge } from "@/components/library/status-badge";
import { BackButton } from "@/components/ui/back-button";

// A bird's-eye map of the workspace drawn as a connected org-chart:
// Workspace → each social platform → its four content-type cards (count + mini
// previews + "View all"), with a Recent Content strip underneath. The tree
// scrolls horizontally when there are more platforms than fit.
export function WorkspaceOverview({ overview }: { overview: Overview }) {
  const line = "#e6ebf1";
  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      {/* Scoped org-chart connector lines (pure CSS, no deps). */}
      <style>{`
        .wtree ul { position: relative; display: flex; justify-content: center; padding-top: 22px; }
        .wtree li { position: relative; display: flex; flex-direction: column;
          align-items: center; padding: 22px 12px 0; }
        .wtree li::before, .wtree li::after { content: ''; position: absolute; top: 0;
          right: 50%; width: 50%; height: 22px; border-top: 1.5px solid ${line}; }
        .wtree li::after { right: auto; left: 50%; border-left: 1.5px solid ${line}; }
        .wtree li:first-child::before, .wtree li:last-child::after { border: 0 none; }
        .wtree li:last-child::before { border-right: 1.5px solid ${line}; border-radius: 0 7px 0 0; }
        .wtree li:first-child::after { border-radius: 7px 0 0 0; }
        .wtree ul ul::before { content: ''; position: absolute; top: 0; left: 50%;
          width: 0; height: 22px; border-left: 1.5px solid ${line}; }
        .wtree > ul { padding-top: 0; }
        .wtree > ul > li { padding-top: 0; }
        .wtree > ul > li::before, .wtree > ul > li::after { display: none; }
      `}</style>

      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">Workspace overview</h2>
        {overview.total > 0 && (
          <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[12px] font-bold text-teal-dark tabular-nums">
            {overview.total}
          </span>
        )}
      </div>
      <p className="mb-5 text-[13px] text-slate">
        Overview of your content across all platforms.
      </p>

      {overview.groups.length === 0 ? (
        <div className="grid place-items-center py-20 text-center text-slate">
          Nothing here yet — save or upload content and tag it to a platform.
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          {/* Each platform is its own subtree (node + its content-type cards),
              laid in a row that scrolls sideways when there are many platforms. */}
          <div className="wtree w-max min-w-full">
            <ul className="!justify-start gap-8">
              {overview.groups.map((g) => (
                <li key={g.id}>
                  <PlatformNode group={g} />

                  {/* Content-type cards */}
                  <ul>
                    {g.categories.map((cat) => (
                      <li key={cat.key}>
                        <CategoryCard channelId={g.id} cat={cat} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recent Content strip */}
      <section className="surface mt-6 rounded-card border border-line/70 p-5">
        <div className="mb-3.5 flex items-center gap-3">
          <h3 className="font-display text-[15px]">Recent Content</h3>
          <Link
            href="/images"
            className="ml-auto text-[12.5px] font-semibold text-teal-dark hover:underline"
          >
            View all content →
          </Link>
        </div>
        {overview.recent.length === 0 ? (
          <div className="py-8 text-center text-[12.5px] text-slate">
            Nothing saved yet — content you create or upload shows up here.
          </div>
        ) : (
          <div className="flex gap-3.5 overflow-x-auto pb-1">
            {overview.recent.map((r) => (
              <RecentCard key={r.id} item={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlatformNode({ group: g }: { group: OverviewGroup }) {
  const typeCount = g.categories.filter((c) => c.count > 0).length;
  return (
    <div className="flex w-[220px] items-center gap-2.5 rounded-card border border-line bg-card px-3.5 py-3 shadow-soft">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white shadow-soft"
        style={{ background: g.color }}
      >
        <PlatformIcon name={g.name} icon={g.icon} size={18} mono />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[14.5px] font-semibold">{g.name}</div>
        <div className="text-[11.5px] text-slate">
          {typeCount} content {typeCount === 1 ? "type" : "types"}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold text-slate tabular-nums">
        {g.count}
      </span>
    </div>
  );
}

function CategoryCard({ channelId, cat }: { channelId: string; cat: OverviewCategory }) {
  const viewAllHref =
    channelId === "unassigned"
      ? `/${cat.slug}`
      : `/${cat.slug}?channel=${encodeURIComponent(channelId)}`;

  return (
    <div className="flex w-[168px] flex-col rounded-card border border-line/70 bg-card p-3.5 shadow-soft">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className="text-[14px]">
          {TYPE_ICONS[cat.key] ?? "📄"}
        </span>
        <span className="truncate text-[12.5px] font-semibold">{cat.label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display text-[22px] font-bold tabular-nums leading-none">
          {cat.count}
        </span>
        <span className="text-[11px] text-slate">items</span>
      </div>

      {cat.previews.length > 0 ? (
        <div className="mt-2.5 flex gap-1">
          {cat.previews.slice(0, 3).map((p) => (
            <MiniPreview key={p.id} title={p.title} type={p.type} thumbnailUrl={p.thumbnailUrl} />
          ))}
        </div>
      ) : (
        <div className="mt-2.5 grid h-[44px] place-items-center rounded-[8px] bg-bg text-[11px] text-slate">
          None yet
        </div>
      )}

      {cat.count > 0 && (
        <Link
          href={viewAllHref}
          className="mt-2.5 text-[11.5px] font-semibold text-teal-dark hover:underline"
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
        className="h-[44px] w-[44px] shrink-0 rounded-[8px] object-cover"
      />
    );
  }
  const [c1, c2] = gradientFor(title);
  return (
    <div
      title={title}
      className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[8px] text-[14px]"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <span>{TYPE_ICONS[type] ?? "📄"}</span>
    </div>
  );
}

function RecentCard({ item }: { item: OverviewRecent }) {
  const slug = LIBRARY_SLUGS[(TYPE_TO_VIEW[item.type] ?? "IMAGE") as keyof typeof LIBRARY_SLUGS];
  return (
    <Link
      href={`/${slug}`}
      className="card-lift group w-[168px] shrink-0 overflow-hidden rounded-card border border-line/70 bg-card shadow-soft"
    >
      <div className="relative overflow-hidden">
        <RecentThumb title={item.title} type={item.type} thumbnailUrl={item.thumbnailUrl} />
        {/* Content-type label pill */}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
        {/* Platform brand-logo badge */}
        {item.platform && (
          <span
            title={item.platform.name}
            className="absolute bottom-2 left-2 grid h-5 w-5 place-items-center rounded-full bg-white shadow-soft"
          >
            <PlatformIcon name={item.platform.name} icon={item.platform.icon} size={13} />
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-[12px] font-semibold">{item.title}</div>
        <div className="mt-1.5">
          <StatusBadge status={item.status} />
        </div>
      </div>
    </Link>
  );
}

function RecentThumb({
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
        className="h-[96px] w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.04]"
      />
    );
  }
  const [c1, c2] = gradientFor(title);
  return (
    <div
      className="grid h-[96px] w-full place-items-center text-2xl"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <span>{TYPE_ICONS[type] ?? "📄"}</span>
    </div>
  );
}

// VIDEO_SCRIPT folds into the Video library view; everything else maps 1:1.
const TYPE_TO_VIEW: Record<string, string> = {
  IMAGE: "IMAGE",
  THUMBNAIL: "THUMBNAIL",
  VIDEO: "VIDEO",
  VIDEO_SCRIPT: "VIDEO",
  BLOGPOST: "BLOGPOST",
};
