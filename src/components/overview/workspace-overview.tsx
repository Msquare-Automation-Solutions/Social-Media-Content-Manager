import Link from "next/link";
import type {
  WorkspaceOverview as Overview,
  OverviewGroup,
  OverviewCategory,
  OverviewRecent,
} from "@/lib/data";
import { TYPE_ICON_NAMES, TYPE_LABELS, LIBRARY_SLUGS } from "@/lib/library";
import { Icon } from "@/components/ui/icons";
import { gradientFor } from "@/lib/artifact-view";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { StatusBadge } from "@/components/library/status-badge";
import { BackButton } from "@/components/ui/back-button";
import { OverviewFilters } from "@/components/overview/overview-filters";
import { CenteredScroll } from "@/components/overview/centered-scroll";

// A bird's-eye map of the workspace drawn as a connected org-chart:
// Workspace → each social platform → its four content-type cards (count + mini
// previews + "View all"), with a Recent Content strip underneath. The tree
// scrolls horizontally when there are more platforms than fit.
export function WorkspaceOverview({
  overview,
  filters,
}: {
  overview: Overview;
  filters: { status: string; from: string; to: string };
}) {
  const line = "#e6ebf1";
  return (
    <div className="flex-1 overflow-y-auto px-7 pb-4 pt-6">
      {/* Scoped org-chart connector lines (pure CSS, no deps). */}
      <style>{`
        .wtree ul { position: relative; display: flex; justify-content: center; padding-top: 22px; }
        .wtree li { position: relative; display: flex; flex-direction: column;
          align-items: center; padding: 22px 7px 0; }
        .wtree li::before, .wtree li::after { content: ''; position: absolute; top: 0;
          right: 50%; width: 50%; height: 22px; border-top: 1.5px solid ${line}; }
        .wtree li::after { right: auto; left: 50%; border-left: 1.5px solid ${line}; }
        .wtree li:first-child::before, .wtree li:last-child::after { border: 0 none; }
        .wtree li:last-child::before { border-right: 1.5px solid ${line}; border-radius: 0 7px 0 0; }
        .wtree li:first-child::after { border-radius: 7px 0 0 0; }
        /* A lone child gets a straight vertical connector, not the rounded
           first+last "hook". Must come after the first/last rules to win. */
        .wtree li:only-child::before { display: none; }
        .wtree li:only-child::after { display: block; border: 0 none;
          border-left: 1.5px solid ${line}; border-radius: 0; left: 50%; right: auto; }
        .wtree ul ul::before { content: ''; position: absolute; top: 0; left: 50%;
          width: 0; height: 22px; border-left: 1.5px solid ${line}; }
        /* The single workspace root sits flush at the top with no connector
           above it; its children (the platforms) draw the branch below. */
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
      <p className="mb-3 text-[13px] text-slate">
        Overview of your content across all platforms.
      </p>

      <OverviewFilters filters={filters} />

      {overview.groups.length === 0 ? (
        <div className="grid place-items-center py-20 text-center text-slate">
          {filters.status || filters.from || filters.to
            ? "No content matches these filters."
            : "Nothing here yet — save or upload content and tag it to a platform."}
        </div>
      ) : (
        <CenteredScroll className="pb-4">
          {/* The workspace root and its branch live inside the scroll area so the
              whole org chart (root → platforms → categories) moves together;
              CenteredScroll opens centered on the root. */}
          <div className="wtree w-max min-w-full">
            <ul>
              <li>
                <RootNode total={overview.total} />

                <ul className="!justify-start gap-5">
                  {overview.groups.map((g) => (
                    <li key={g.id}>
                      <PlatformNode group={g} />

                      {/* Only content-type cards that actually have items —
                          empty categories are hidden until content appears. */}
                      <ul>
                        {g.categories
                          .filter((cat) => cat.count > 0)
                          .map((cat) => (
                            <li key={cat.key}>
                              <CategoryCard channelId={g.id} cat={cat} filters={filters} />
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
        </CenteredScroll>
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

function RootNode({ total }: { total: number }) {
  return (
    <div className="mb-1 flex items-center gap-2.5 rounded-[14px] bg-brand-teal px-4 py-2.5 text-white shadow-glow-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
        <Icon name="overview" size={18} />
      </span>
      <div className="min-w-0">
        <div className="font-display text-[13.5px] font-semibold">All platforms</div>
        <div className="text-[11px] text-white/75">{total} items total</div>
      </div>
    </div>
  );
}

function PlatformNode({ group: g }: { group: OverviewGroup }) {
  const typeCount = g.categories.filter((c) => c.count > 0).length;
  return (
    <div
      className="flex w-[192px] items-center gap-2.5 rounded-[14px] border px-3.5 py-2.5"
      style={{ background: `${g.color}0d`, borderColor: `${g.color}30` }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-soft ring-1 ring-black/5">
        <PlatformIcon name={g.name} icon={g.icon} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[13.5px] font-semibold">{g.name}</div>
        <div className="text-[11px] text-slate">
          {typeCount} content {typeCount === 1 ? "type" : "types"}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({
  channelId,
  cat,
  filters,
}: {
  channelId: string;
  cat: OverviewCategory;
  filters: { status: string; from: string; to: string };
}) {
  // "View all" carries the tree's active filters (status/date) into the library
  // so the list shows exactly what the card counted.
  const params = new URLSearchParams({
    ...(channelId !== "unassigned" && { channel: channelId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    person: "all",
  });
  const viewAllHref = `/${cat.slug}?${params.toString()}`;

  return (
    <div className="flex w-[128px] flex-col items-center rounded-[13px] border border-line/70 bg-card px-2.5 pt-3 text-center">
      <div className="flex items-center gap-1.5">
        <Icon name={TYPE_ICON_NAMES[cat.key] ?? "other"} size={15} className="text-teal-dark" />
        <span className="truncate text-[12px] font-semibold">{cat.label}</span>
      </div>
      <div className="mt-1.5 font-display text-[23px] font-bold tabular-nums leading-none">
        {cat.count}
      </div>
      <div className="mt-0.5 text-[10.5px] text-slate">items</div>

      {cat.previews.length > 0 ? (
        <div className="mt-2 flex w-full gap-1">
          {cat.previews.slice(0, 2).map((p) => (
            <MiniPreview key={p.id} title={p.title} type={p.type} thumbnailUrl={p.thumbnailUrl} />
          ))}
        </div>
      ) : (
        <div className="mt-2 grid h-[48px] w-full place-items-center rounded-[8px] bg-bg text-[10.5px] text-slate">
          None yet
        </div>
      )}

      {/* Always render a footer of equal height so cards stay uniform whether
          or not they have content. */}
      <div className="mt-2 w-[calc(100%+20px)] border-t border-line/60 py-2 text-[11px] font-semibold">
        {cat.count > 0 ? (
          <Link href={viewAllHref} className="text-teal-dark hover:underline">
            View all →
          </Link>
        ) : (
          <span className="text-slate/40">—</span>
        )}
      </div>
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
        className="h-[48px] min-w-0 flex-1 rounded-[8px] object-cover"
      />
    );
  }
  const [c1, c2] = gradientFor(title);
  return (
    <div
      title={title}
      className="grid h-[48px] min-w-0 flex-1 place-items-center rounded-[8px]"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <Icon name={TYPE_ICON_NAMES[type] ?? "other"} size={18} className="text-white/95" />
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
        {/* Platform brand-logo badge (top-left, matches library cards) */}
        {item.platform && (
          <span
            title={item.platform.name}
            className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white shadow-soft"
          >
            <PlatformIcon name={item.platform.name} icon={item.platform.icon} size={15} />
          </span>
        )}
        {/* Content-type label pill (bottom-left, white chip) */}
        <span className="absolute bottom-2 left-2 rounded-[8px] bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold text-[#141f2e] shadow-soft backdrop-blur-sm">
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
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
      className="grid h-[96px] w-full place-items-center"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <Icon name={TYPE_ICON_NAMES[type] ?? "other"} size={30} className="text-white/95" />
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
