import { prisma } from "@/lib/db";
import { LIBRARY_VIEWS, LIBRARY_SLUGS, typesForView, type LibraryViewKey } from "@/lib/library";
import { parseTags, parseJson } from "@/lib/json";
import { describeActivity } from "@/lib/activity-format";

export type LibraryFilters = {
  personId?: string;
  channelId?: string;
  accountId?: string;
  status?: string;
  type?: string; // LibraryViewKey — narrow to one category (Approved page)
  q?: string;
  sort?: "newest" | "name" | "postdate";
  from?: string; // yyyy-mm-dd — createdAt range (inclusive)
  to?: string;
};

// A Prisma `createdAt` filter from an inclusive yyyy-mm-dd range (mirrors the
// date parsing in listActivity). Returns undefined when neither bound is set.
export function createdAtRange(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000`);
  if (to) range.lte = new Date(`${to}T23:59:59.999`);
  return range.gte || range.lte ? range : undefined;
}

// Shared shape + mappers for asset grids (library + approved). The include is
// declared once so every grid query returns the same row shape.
const ASSET_LIST_INCLUDE = {
  person: { select: { id: true, name: true, avatarColor: true } },
  channels: {
    include: { channel: { select: { id: true, name: true, icon: true, color: true } } },
  },
  accounts: {
    include: { account: { select: { id: true, name: true, icon: true, color: true } } },
  },
} as const;

type AssetRow = {
  id: string;
  title: string;
  type: string;
  source: string;
  status: string;
  reviewNote: string | null;
  thumbnailUrl: string | null;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  html: string | null;
  url: string | null;
  person: { id: string; name: string; avatarColor: string };
  channels: {
    scheduledFor: Date | null;
    channel: { id: string; name: string; icon: string; color: string };
  }[];
  accounts: {
    account: { id: string; name: string; icon: string; color: string };
  }[];
};

function mapAssetRow(a: AssetRow): AssetListItem {
  const channels = a.channels.map((c) => ({
    ...c.channel,
    scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
  }));
  const accounts = a.accounts.map((x) => x.account);
  const dates = channels
    .map((c) => c.scheduledFor)
    .filter((d): d is string => Boolean(d))
    .sort();
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    source: a.source,
    status: a.status,
    reviewNote: a.reviewNote,
    thumbnailUrl: a.thumbnailUrl,
    tags: parseTags(a.tags),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    hasHtml: Boolean(a.html),
    url: a.url,
    nextPostDate: dates[0] ?? null,
    person: a.person,
    channels,
    accounts,
  };
}

// Case-insensitive title/tag search + sort, in-memory (workspace is small).
function filterAndSortAssets(items: AssetListItem[], filters: LibraryFilters): AssetListItem[] {
  let out = items;
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  if (filters.sort === "name") {
    out = [...out].sort((a, b) => a.title.localeCompare(b.title));
  } else if (filters.sort === "postdate") {
    // Assets with a post date first (soonest → latest); undated last. In the
    // scheduled-this-month list, sort by the in-month date so order matches the
    // badge rather than a stray earlier-month schedule.
    const key = (a: AssetListItem) => a.monthSchedule?.date ?? a.nextPostDate;
    out = [...out].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (!ka && !kb) return 0;
      if (!ka) return 1;
      if (!kb) return -1;
      return ka.localeCompare(kb);
    });
  }
  return out;
}

export type AssetListItem = {
  id: string;
  title: string;
  type: string;
  source: string;
  status: string;
  reviewNote: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  hasHtml: boolean;
  url: string | null;
  nextPostDate: string | null; // earliest platform post date, if any
  // Populated only by the "Scheduled this month" list: the earliest platform
  // whose post date actually falls in the queried month, so the card badge can
  // show *which* platform makes this asset a this-month item (an asset may also
  // be scheduled on other platforms in other months).
  monthSchedule?: { name: string; icon: string; date: string; extra: number } | null;
  person: { id: string; name: string; avatarColor: string };
  channels: {
    id: string;
    name: string;
    icon: string;
    color: string;
    scheduledFor: string | null;
  }[];
  accounts: { id: string; name: string; icon: string; color: string }[];
};

// Workspace-scoped reads used across the app. Everything here takes a
// workspaceId so nothing leaks across workspaces.

export async function getSkill(workspaceId: string) {
  return prisma.skill.findFirst({ where: { workspaceId } });
}

export async function getTrashedAssets(workspaceId: string): Promise<AssetListItem[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const rows = await prisma.mediaAsset.findMany({
    where: { workspaceId, deletedAt: { not: null, gte: cutoff } },
    orderBy: { deletedAt: "desc" },
    include: {
      person: { select: { id: true, name: true, avatarColor: true } },
      channels: { include: { channel: { select: { id: true, name: true, icon: true, color: true } } } },
    },
  });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    source: a.source,
    status: a.status,
    reviewNote: a.reviewNote,
    thumbnailUrl: a.thumbnailUrl,
    tags: parseTags(a.tags),
    createdAt: (a.deletedAt ?? a.createdAt).toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    hasHtml: Boolean(a.html),
    url: a.url,
    nextPostDate: null,
    person: a.person,
    channels: a.channels.map((c) => ({
      ...c.channel,
      scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
    })),
    accounts: [],
  }));
}

export async function listMembers(workspaceId: string) {
  const rows = await prisma.membership.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarColor: true,
          disabledAt: true,
          _count: { select: { createdAssets: true, chatSessions: true } },
        },
      },
    },
  });
  return rows.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarColor: m.user.avatarColor,
    role: m.role,
    disabled: m.user.disabledAt !== null,
    assetCount: m.user._count.createdAssets,
    chatCount: m.user._count.chatSessions,
  }));
}

export async function listPendingInvites(workspaceId: string) {
  return prisma.invite.findMany({
    where: { workspaceId, acceptedAt: null },
    orderBy: { expiresAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true },
  });
}

export type ActivityRow = {
  id: string;
  actorName: string;
  actorAvatarColor: string;
  action: string;
  category: string;
  description: string;
  createdAt: string;
};

/** Recent activity for the admin audit panel (workspace-scoped, newest first). */
export async function listActivity(
  workspaceId: string,
  opts: {
    actorId?: string;
    category?: string;
    from?: string; // yyyy-mm-dd, inclusive
    to?: string; // yyyy-mm-dd, inclusive (whole day)
    cursor?: string;
    take?: number;
  } = {},
): Promise<ActivityRow[]> {
  // createdAt bounds: from (start of day) .. to (end of day); cursor paginates
  // older-than within that window.
  const createdAt: { gte?: Date; lte?: Date; lt?: Date } = {};
  if (opts.from) createdAt.gte = new Date(`${opts.from}T00:00:00.000`);
  if (opts.cursor) createdAt.lt = new Date(opts.cursor);
  else if (opts.to) createdAt.lte = new Date(`${opts.to}T23:59:59.999`);

  const rows = await prisma.activityLog.findMany({
    where: {
      workspaceId,
      ...(opts.actorId ? { actorId: opts.actorId } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50,
  });
  return rows.map((r) => ({
    id: r.id,
    actorName: r.actorName,
    actorAvatarColor: r.actorAvatarColor,
    action: r.action,
    category: r.category,
    description: describeActivity({
      action: r.action,
      targetType: r.targetType,
      targetLabel: r.targetLabel,
      metadata: r.metadata ? parseJson<Record<string, unknown>>(r.metadata, {}) : null,
    }),
    createdAt: r.createdAt.toISOString(),
  }));
}

export type CreatorRow = {
  id: string;
  name: string;
  label: string | null;
  email: string | null;
  avatarColor: string;
  linkedToLogin: boolean;
  assetCount: number;
};

/** All Person/creator records with how many (live) assets are attributed. */
export async function listCreators(workspaceId: string): Promise<CreatorRow[]> {
  const people = await prisma.person.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { assets: { where: { deletedAt: null } } } },
    },
  });
  return people.map((p) => ({
    id: p.id,
    name: p.name,
    label: p.label,
    email: p.email,
    avatarColor: p.avatarColor,
    linkedToLogin: Boolean(p.userId),
    assetCount: p._count.assets,
  }));
}

export type AccountRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  assetCount: number;
};

/** All (non-archived) accounts with how many live assets are assigned. */
export async function listAccounts(workspaceId: string): Promise<AccountRow[]> {
  const accounts = await prisma.account.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { assets: { where: { asset: { deletedAt: null } } } } },
    },
  });
  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    color: a.color,
    assetCount: a._count.assets,
  }));
}

// ── Content Bin ──────────────────────────────────────────────────────────────
// A lightweight inbox of captured ideas (links / screenshots / notes) that can
// later be promoted into a MediaAsset. See CLAUDE.md "Content Bin".

export type BinFilters = {
  status?: string; // NEW | USED | DISCARDED
  personId?: string; // creator
  accountId?: string;
  channelId?: string; // social platform
  category?: string; // ASSET_TYPES value
  q?: string; // title / note / tag search
  from?: string; // yyyy-mm-dd createdAt range
  to?: string;
};

export type ContentBinRow = {
  id: string;
  title: string;
  note: string;
  links: string[];
  tags: string[];
  status: string;
  personId: string | null;
  category: string | null;
  channelIds: string[];
  accountIds: string[];
  screenshots: string[];
  promotedAssetId: string | null;
  createdBy: { id: string; name: string; avatarColor: string } | null;
  createdAt: string;
  updatedAt: string;
};

/** Captured Content Bin items (workspace-scoped, newest first). Discarded items
 * stay in the bin (only hard-delete sets deletedAt). Search/sort in memory. */
export async function listContentBin(
  workspaceId: string,
  filters: BinFilters = {},
): Promise<ContentBinRow[]> {
  const rows = await prisma.contentBinItem.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(createdAtRange(filters.from, filters.to)
        ? { createdAt: createdAtRange(filters.from, filters.to) }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve capturer names in one query (createdById isn't a hard relation).
  const userIds = [...new Set(rows.map((r) => r.createdById))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatarColor: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const items: ContentBinRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    note: r.note,
    links: parseTags(r.links),
    tags: parseTags(r.tags),
    status: r.status,
    personId: r.personId,
    category: r.category,
    channelIds: parseTags(r.channelIds),
    accountIds: parseTags(r.accountIds),
    screenshots: parseTags(r.screenshots),
    promotedAssetId: r.promotedAssetId,
    createdBy: userById.get(r.createdById) ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  // Taxonomy filters (channelIds/accountIds are JSON arrays → match in memory).
  const filtered = items.filter(
    (i) =>
      (!filters.personId || i.personId === filters.personId) &&
      (!filters.category || i.category === filters.category) &&
      (!filters.accountId || i.accountIds.includes(filters.accountId)) &&
      (!filters.channelId || i.channelIds.includes(filters.channelId)),
  );
  return searchBinItems(filtered, filters.q);
}

/** Case-insensitive search over a bin item's title / note / tags / links.
 * Pure so it's unit-testable without a DB (workspace is small → in-memory). */
export function searchBinItems<
  T extends { title: string; note: string; tags: string[]; links: string[] },
>(items: T[], query?: string): T[] {
  const q = query?.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.note.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q)) ||
      i.links.some((l) => l.toLowerCase().includes(q)),
  );
}

/** Live bin count for the sidebar badge — excludes Discarded (rejected ideas). */
export async function getBinCount(workspaceId: string): Promise<number> {
  return prisma.contentBinItem.count({
    where: { workspaceId, deletedAt: null, status: { not: "DISCARDED" } },
  });
}

export async function getAssetCounts(
  workspaceId: string,
): Promise<Record<LibraryViewKey, number>> {
  const rows = await prisma.mediaAsset.groupBy({
    by: ["type"],
    where: { workspaceId, deletedAt: null },
    _count: { _all: true },
  });
  const byType = new Map(rows.map((r) => [r.type, r._count._all]));
  const out = {} as Record<LibraryViewKey, number>;
  for (const view of LIBRARY_VIEWS) {
    out[view.key] = view.types.reduce((n, t) => n + (byType.get(t) ?? 0), 0);
  }
  return out;
}

// ── Dashboard ────────────────────────────────────────────────────────────────
// Workspace-wide analytics. The math lives in the pure `aggregateDashboard`
// helper (unit-tested without a DB); `getDashboardData` only does the queries.

export type DashAsset = {
  id: string;
  title: string;
  type: string;
  status: string;
  channels: { channelId: string; scheduledFor: string | null }[];
};
export type DashChannel = { id: string; name: string; icon: string; color: string };

export type TypeSlice = { key: LibraryViewKey; label: string; count: number };
export type StatusCounts = { PENDING: number; REWORK: number; APPROVED: number; PUBLISHED: number };

export type PlatformSlice = {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  byType: TypeSlice[];
  byStatus: StatusCounts;
  scheduledThisMonth: number;
};

export type DashboardData = {
  totalAssets: number;
  statusCounts: StatusCounts;
  scheduledThisMonth: number;
  // Posts scheduled from today onward — forward-looking, ignores the range's
  // To bound (scheduling is inherently future, the range often trails). Powers
  // the "Scheduled ahead" KPI tile.
  scheduledAhead: number;
  byType: TypeSlice[];
  perPlatform: PlatformSlice[];
  upcoming: {
    id: string;
    title: string;
    platformName: string;
    platformIcon: string;
    platformColor: string;
    date: string;
  }[];
  topCreators: { name: string; avatarColor: string; assetCount: number }[];
};

function typeBreakdown(assets: { type: string }[]): TypeSlice[] {
  return LIBRARY_VIEWS.map((v) => ({
    key: v.key,
    label: v.label,
    count: assets.filter((a) => (v.types as readonly string[]).includes(a.type)).length,
  }));
}

function statusBreakdown(assets: { status: string }[]): StatusCounts {
  return {
    PENDING: assets.filter((a) => a.status === "PENDING").length,
    REWORK: assets.filter((a) => a.status === "REWORK").length,
    APPROVED: assets.filter((a) => a.status === "APPROVED").length,
    PUBLISHED: assets.filter((a) => a.status === "PUBLISHED").length,
  };
}

/**
 * Pure dashboard aggregation — deterministic given `now`, so it's unit-testable.
 * When a `range` is supplied (the dashboard's date filter), the "scheduled"
 * window is that range; otherwise it's the calendar month of `now`.
 */
export function aggregateDashboard(
  assets: DashAsset[],
  channels: DashChannel[],
  creators: Pick<CreatorRow, "name" | "avatarColor" | "assetCount">[],
  now: Date,
  range?: { start: Date; end: Date },
): DashboardData {
  const winStart = range ? range.start : new Date(now.getFullYear(), now.getMonth(), 1);
  const winEnd = range ? range.end : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const inMonth = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= winStart && d <= winEnd;
  };
  // The actual current calendar month — independent of the From/To range (which
  // scopes createdAt). Anything labeled "this month" must use this, or a
  // trailing range would hide posts genuinely scheduled later this month.
  const calMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const calMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const inCalendarMonth = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= calMonthStart && d < calMonthEnd;
  };
  // # of assets with at least one platform post date this month.
  const scheduledThisMonth = (list: DashAsset[]) =>
    list.filter((a) => a.channels.some((c) => inMonth(c.scheduledFor))).length;
  // # of *approved* assets with at least one platform scheduled from today
  // onward. Ignores the To bound (a trailing range shouldn't hide upcoming
  // posts) and excludes anything still pending/rework — only signed-off content
  // is genuinely "going out".
  const scheduledAhead = assets.filter(
    (a) =>
      a.status === "APPROVED" &&
      a.channels.some((c) => c.scheduledFor && new Date(c.scheduledFor) >= todayStart),
  ).length;

  const perPlatform: PlatformSlice[] = channels.map((ch) => {
    const tagged = assets.filter((a) =>
      a.channels.some((c) => c.channelId === ch.id),
    );
    return {
      id: ch.id,
      name: ch.name,
      icon: ch.icon,
      color: ch.color,
      total: tagged.length,
      byType: typeBreakdown(tagged),
      byStatus: statusBreakdown(tagged),
      // Post dates for *this* platform in the current calendar month (the
      // spotlight labels it "this month", so it must not follow the range).
      scheduledThisMonth: tagged.filter((a) =>
        a.channels.some((c) => c.channelId === ch.id && inCalendarMonth(c.scheduledFor)),
      ).length,
    };
  });

  const upcoming = assets
    .flatMap((a) =>
      a.channels
        .filter((c) => c.scheduledFor && new Date(c.scheduledFor) >= todayStart)
        .map((c) => {
          const ch = channels.find((x) => x.id === c.channelId);
          return {
            id: a.id,
            title: a.title,
            date: c.scheduledFor as string,
            platformName: ch?.name ?? "—",
            platformIcon: ch?.icon ?? "",
            platformColor: ch?.color ?? "#0e9f8f",
          };
        }),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const topCreators = creators
    .filter((c) => c.assetCount > 0)
    .sort((a, b) => b.assetCount - a.assetCount)
    .slice(0, 5)
    .map((c) => ({ name: c.name, avatarColor: c.avatarColor, assetCount: c.assetCount }));

  return {
    totalAssets: assets.length,
    statusCounts: statusBreakdown(assets),
    scheduledThisMonth: scheduledThisMonth(assets),
    scheduledAhead,
    byType: typeBreakdown(assets),
    perPlatform,
    upcoming,
    topCreators,
  };
}

/** Workspace-wide analytics for the dashboard page (visible to everyone). */
export async function getDashboardData(
  workspaceId: string,
  opts: { from?: string; to?: string } = {},
): Promise<DashboardData> {
  const range = createdAtRange(opts.from, opts.to);
  const [assets, channels, creators] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { workspaceId, deletedAt: null, ...(range ? { createdAt: range } : {}) },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        channels: { select: { channelId: true, scheduledFor: true } },
      },
    }),
    prisma.socialChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    listCreators(workspaceId),
  ]);

  const input: DashAsset[] = assets.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    channels: a.channels.map((c) => ({
      channelId: c.channelId,
      scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
    })),
  }));

  const dashRange =
    opts.from || opts.to
      ? {
          start: opts.from ? new Date(`${opts.from}T00:00:00.000`) : new Date(0),
          end: opts.to ? new Date(`${opts.to}T23:59:59.999`) : new Date(),
        }
      : undefined;
  return aggregateDashboard(input, channels, creators, new Date(), dashRange);
}

// ── Workspace overview (Platform → content-type cards) ──────────────────────
const UNASSIGNED_ID = "unassigned";

export type OverviewLeaf = { id: string; title: string; type: string; thumbnailUrl: string | null };
export type OverviewCategory = {
  key: LibraryViewKey;
  label: string;
  slug: string;
  count: number;
  previews: OverviewLeaf[];
};
// A platform branches into the accounts present on it; each account branches
// into content-type cards.
export type OverviewAccountGroup = {
  id: string; // accountId, or "unassigned"
  name: string;
  icon: string;
  color: string;
  count: number;
  categories: OverviewCategory[];
};
export type OverviewGroup = {
  id: string; // channelId, or "unassigned"
  name: string;
  icon: string;
  color: string;
  count: number; // distinct assets under this platform
  accounts: OverviewAccountGroup[];
};
export type OverviewRecent = {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string | null;
  status: string;
  platform: { name: string; icon: string; color: string } | null;
};
export type WorkspaceOverview = {
  total: number;
  groups: OverviewGroup[];
  recent: OverviewRecent[];
};

type OverviewAsset = {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string | null;
  status: string;
  channels: { id: string }[];
  accounts: { id: string }[];
};

type OverviewAccountDef = { id: string; name: string; icon: string; color: string };

// The tree shows the social-media content types; "Other" is a catch-all that
// isn't platform content, so it stays out of the tree (it still has its own
// library, filters, and dashboard buckets).
const TREE_VIEWS = LIBRARY_VIEWS.filter((v) => v.key !== "OTHER");

/** Pure: group platform content into Platform → Account → content-type cards. */
export function buildWorkspaceOverview(
  assets: OverviewAsset[],
  channels: { id: string; name: string; icon: string; color: string }[],
  accountDefs: OverviewAccountDef[] = [],
): WorkspaceOverview {
  const viewFor = (type: string): LibraryViewKey | null =>
    LIBRARY_VIEWS.find((v) => (v.types as readonly string[]).includes(type))?.key ?? null;

  // Other-typed items don't belong to a platform tree.
  const treeAssets = assets.filter((a) => viewFor(a.type) !== "OTHER");

  const push2 = (map: Map<string, OverviewAsset[]>, key: string, a: OverviewAsset) => {
    const arr = map.get(key);
    if (arr) arr.push(a);
    else map.set(key, [a]);
  };
  const byGroup = new Map<string, OverviewAsset[]>();
  const push = (gid: string, a: OverviewAsset) => push2(byGroup, gid, a);
  for (const a of treeAssets) {
    if (a.channels.length === 0) push(UNASSIGNED_ID, a);
    else for (const c of a.channels) push(c.id, a);
  }

  const categoriesFor = (list: OverviewAsset[]): OverviewCategory[] =>
    TREE_VIEWS.map((v) => {
      const items = list.filter((a) => viewFor(a.type) === v.key);
      return {
        key: v.key,
        label: v.label,
        slug: LIBRARY_SLUGS[v.key],
        count: items.length,
        previews: items.slice(0, 4).map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          thumbnailUrl: a.thumbnailUrl,
        })),
      };
    });

  // Within a platform's assets, branch by account (an asset with several
  // accounts appears under each; account-less assets fall under "No account").
  const accountGroupsFor = (list: OverviewAsset[]): OverviewAccountGroup[] => {
    const byAcct = new Map<string, OverviewAsset[]>();
    for (const a of list) {
      if (a.accounts.length === 0) push2(byAcct, UNASSIGNED_ID, a);
      else for (const ac of a.accounts) push2(byAcct, ac.id, a);
    }
    const out: OverviewAccountGroup[] = [];
    for (const def of accountDefs) {
      const l = byAcct.get(def.id);
      if (!l || l.length === 0) continue;
      out.push({
        id: def.id,
        name: def.name,
        icon: def.icon,
        color: def.color,
        count: l.length,
        categories: categoriesFor(l),
      });
    }
    const noAcct = byAcct.get(UNASSIGNED_ID);
    if (noAcct && noAcct.length > 0) {
      out.push({
        id: UNASSIGNED_ID,
        name: "No account",
        icon: "—",
        color: "#9aa7b6",
        count: noAcct.length,
        categories: categoriesFor(noAcct),
      });
    }
    return out;
  };

  const groups: OverviewGroup[] = [];
  for (const ch of channels) {
    const list = byGroup.get(ch.id);
    if (!list || list.length === 0) continue;
    groups.push({
      id: ch.id,
      name: ch.name,
      icon: ch.icon,
      color: ch.color,
      count: list.length,
      accounts: accountGroupsFor(list),
    });
  }
  const orphans = byGroup.get(UNASSIGNED_ID);
  if (orphans && orphans.length > 0) {
    groups.push({
      id: UNASSIGNED_ID,
      name: "Unassigned",
      icon: "—",
      color: "#9aa7b6",
      count: orphans.length,
      accounts: accountGroupsFor(orphans),
    });
  }

  // Recent strip: newest 8 assets (input is already sorted newest-first), each
  // tagged with its first platform (null when the asset has none).
  const channelById = new Map(channels.map((c) => [c.id, c]));
  const recent: OverviewRecent[] = assets.slice(0, 8).map((a) => {
    const ch = a.channels[0] ? channelById.get(a.channels[0].id) : undefined;
    return {
      id: a.id,
      title: a.title,
      type: a.type,
      thumbnailUrl: a.thumbnailUrl,
      status: a.status,
      platform: ch ? { name: ch.name, icon: ch.icon, color: ch.color } : null,
    };
  });

  return { total: treeAssets.length, groups, recent };
}

export async function getWorkspaceOverview(
  workspaceId: string,
  opts: { status?: string; from?: string; to?: string } = {},
): Promise<WorkspaceOverview> {
  const range = createdAtRange(opts.from, opts.to);
  const [rows, channels, accountDefs] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(opts.status ? { status: opts.status } : {}),
        ...(range ? { createdAt: range } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        thumbnailUrl: true,
        status: true,
        channels: { select: { channelId: true } },
        accounts: { select: { accountId: true } },
      },
    }),
    prisma.socialChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    prisma.account.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);

  const assets: OverviewAsset[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    thumbnailUrl: a.thumbnailUrl,
    status: a.status,
    channels: a.channels.map((c) => ({ id: c.channelId })),
    accounts: a.accounts.map((x) => ({ id: x.accountId })),
  }));

  return buildWorkspaceOverview(assets, channels, accountDefs);
}

export async function listSessions(workspaceId: string, userId: string) {
  return prisma.chatSession.findMany({
    where: { workspaceId, userId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });
}

export async function getSessionWithMessages(
  sessionId: string,
  workspaceId: string,
) {
  return prisma.chatSession.findFirst({
    where: { id: sessionId, workspaceId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getLibraryAssets(
  workspaceId: string,
  view: LibraryViewKey,
  filters: LibraryFilters,
): Promise<AssetListItem[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      type: { in: typesForView(view) },
      ...(filters.personId ? { personId: filters.personId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.channelId
        ? { channels: { some: { channelId: filters.channelId } } }
        : {}),
      ...(filters.accountId
        ? { accounts: { some: { accountId: filters.accountId } } }
        : {}),
      ...(createdAtRange(filters.from, filters.to)
        ? { createdAt: createdAtRange(filters.from, filters.to) }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: ASSET_LIST_INCLUDE,
  });

  return filterAndSortAssets(rows.map(mapAssetRow), filters);
}

/**
 * Every asset in a given status across all types as grid cards (workspace-
 * scoped) — the payoff gallery views (Approved, Published). Same person /
 * platform / search / sort filters as the library, plus an optional category
 * (type) narrow.
 */
export async function getAssetsByStatus(
  workspaceId: string,
  status: string,
  filters: LibraryFilters,
): Promise<AssetListItem[]> {
  const rows = await prisma.mediaAsset.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      status,
      ...(filters.type ? { type: { in: typesForView(filters.type as LibraryViewKey) } } : {}),
      ...(filters.personId ? { personId: filters.personId } : {}),
      ...(filters.channelId ? { channels: { some: { channelId: filters.channelId } } } : {}),
      ...(filters.accountId ? { accounts: { some: { accountId: filters.accountId } } } : {}),
      ...(createdAtRange(filters.from, filters.to)
        ? { createdAt: createdAtRange(filters.from, filters.to) }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: ASSET_LIST_INCLUDE,
  });

  return filterAndSortAssets(rows.map(mapAssetRow), filters);
}

export function getApprovedAssets(workspaceId: string, filters: LibraryFilters) {
  return getAssetsByStatus(workspaceId, "APPROVED", filters);
}

export function getPublishedAssets(workspaceId: string, filters: LibraryFilters) {
  return getAssetsByStatus(workspaceId, "PUBLISHED", filters);
}

/**
 * Assets with any platform post date in the current month — the list behind the
 * dashboard's "Scheduled this month" KPI. Same person / platform / search / sort
 * filters as the galleries. `now` is injectable for testing.
 */
export async function getScheduledThisMonthAssets(
  workspaceId: string,
  filters: LibraryFilters,
  now: Date = new Date(),
): Promise<AssetListItem[]> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const rows = await prisma.mediaAsset.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      // Only approved content — this list backs the "Scheduled ahead" tile,
      // which counts approved posts only. Pending/rework aren't cleared to go out.
      status: "APPROVED",
      channels: { some: { scheduledFor: { gte: monthStart, lt: monthEnd } } },
      ...(filters.type ? { type: { in: typesForView(filters.type as LibraryViewKey) } } : {}),
      ...(filters.personId ? { personId: filters.personId } : {}),
      ...(filters.channelId ? { channels: { some: { channelId: filters.channelId } } } : {}),
      ...(filters.accountId ? { accounts: { some: { accountId: filters.accountId } } } : {}),
      ...(createdAtRange(filters.from, filters.to)
        ? { createdAt: createdAtRange(filters.from, filters.to) }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: ASSET_LIST_INCLUDE,
  });

  const items = rows.map(mapAssetRow).map((a) => {
    // Pick the earliest platform whose post date lands in this month — that's
    // the reason the asset is in the list, and what the card badge should show.
    const inMonth = a.channels
      .filter((c) => {
        if (!c.scheduledFor) return false;
        const d = new Date(c.scheduledFor);
        return d >= monthStart && d < monthEnd;
      })
      .sort((x, y) => (x.scheduledFor! < y.scheduledFor! ? -1 : 1));
    const first = inMonth[0];
    return {
      ...a,
      monthSchedule: first
        ? { name: first.name, icon: first.icon, date: first.scheduledFor!, extra: inMonth.length - 1 }
        : null,
    };
  });

  return filterAndSortAssets(items, filters);
}

/**
 * Compact recent-library summary injected into the Skill system prompt so the
 * chat can reference existing content ("rewrite my last blog post") without a
 * live tool round-trip (see src/lib/ai/tools.ts header).
 */
export async function buildLibraryContext(workspaceId: string): Promise<string> {
  const assets = await prisma.mediaAsset.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, title: true, type: true, person: { select: { name: true } } },
  });
  if (assets.length === 0) return "";
  const lines = assets
    .map((a) => `- [${a.type}] "${a.title}" — by ${a.person.name} (id: ${a.id})`)
    .join("\n");
  return `\n\n## Current library (most recent)\nThe workspace already contains these saved assets. If the user asks to revise or reference one, use it:\n${lines}`;
}
