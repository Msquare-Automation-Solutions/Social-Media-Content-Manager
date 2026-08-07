import { prisma } from "@/lib/db";
import { LIBRARY_VIEWS, LIBRARY_SLUGS, typesForView, type LibraryViewKey } from "@/lib/library";
import { parseTags, parseJson } from "@/lib/json";
import { describeActivity } from "@/lib/activity-format";
import { contentTypeLabel } from "@/lib/tasks";

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
  publishableOnly?: boolean; // Approved/Published panels: only files meant to publish
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
          avatarUrl: true,
          disabledAt: true,
          _count: { select: { createdAssets: true, chatSessions: true } },
        },
      },
    },
  });
  // Each member's designation lives on their linked creator (Person) label.
  const people = await prisma.person.findMany({
    where: { workspaceId, userId: { not: null } },
    select: { userId: true, label: true },
  });
  const labelByUser = new Map(people.map((p) => [p.userId!, p.label ?? ""]));
  return rows.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarColor: m.user.avatarColor,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    designation: labelByUser.get(m.user.id) ?? "",
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

/**
 * Binned (soft-deleted) Content Bin ideas, newest first.
 *
 * `createdById` scopes it to one person — contributors only ever see their own
 * deletions in Trash, since the rest of the bin isn't theirs to restore.
 */
export async function getTrashedBinItems(
  workspaceId: string,
  createdById?: string,
): Promise<ContentBinRow[]> {
  const rows = await prisma.contentBinItem.findMany({
    where: { workspaceId, deletedAt: { not: null }, ...(createdById ? { createdById } : {}) },
    orderBy: { deletedAt: "desc" },
  });
  if (!rows.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.createdById))] } },
    select: { id: true, name: true, avatarColor: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => toBinRow(r, userById.get(r.createdById)));
}

// ── Content Bin leaderboard ──────────────────────────────────────────────────
// Who has captured the most ideas. Counting `createdById` — set server-side from
// the session, never accepted from the browser — so the score can't be gamed by
// tagging someone else as the creator.

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  avatarColor: string;
  avatarUrl: string | null;
  count: number;
};

type Capturer = { id: string; name: string; avatarColor: string; avatarUrl: string | null };

/**
 * Pure: turn per-user tallies into a ranked table. Equal counts share a rank
 * (1, 2, 2, 4) — a tie is a tie, and nobody should be arbitrarily ahead of
 * someone who did the same amount. Ties break by name so the order is stable.
 */
export function rankContributors(
  tallies: { userId: string; count: number }[],
  people: Capturer[],
): LeaderboardRow[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const sorted = [...tallies]
    .filter((t) => t.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (byId.get(a.userId)?.name ?? "").localeCompare(byId.get(b.userId)?.name ?? "");
    });

  let rank = 0;
  let previousCount: number | null = null;
  return sorted.map((t, i) => {
    if (t.count !== previousCount) {
      rank = i + 1;
      previousCount = t.count;
    }
    const p = byId.get(t.userId);
    return {
      rank,
      userId: t.userId,
      name: p?.name ?? "Unknown",
      avatarColor: p?.avatarColor ?? "#0e9f8f",
      avatarUrl: p?.avatarUrl ?? null,
      count: t.count,
    };
  });
}

/** `month` is "YYYY-MM"; omit it for all time. */
export async function getBinLeaderboard(
  workspaceId: string,
  month?: string,
): Promise<LeaderboardRow[]> {
  let range: { gte: Date; lt: Date } | undefined;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    if (y && m) range = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const tallies = await prisma.contentBinItem.groupBy({
    by: ["createdById"],
    where: {
      workspaceId,
      deletedAt: null,
      // Ideas that were thrown out don't score — the same rule the sidebar's bin
      // badge uses, so the two numbers never disagree.
      status: { not: "DISCARDED" },
      ...(range ? { createdAt: range } : {}),
    },
    _count: { _all: true },
  });
  if (!tallies.length) return [];

  // createdById isn't a hard relation, so names come from a second query.
  const people = await prisma.user.findMany({
    where: { id: { in: tallies.map((t) => t.createdById) } },
    select: { id: true, name: true, avatarColor: true, avatarUrl: true },
  });

  return rankContributors(
    tallies.map((t) => ({ userId: t.createdById, count: t._count._all })),
    people,
  );
}

type BinRecord = Awaited<ReturnType<typeof prisma.contentBinItem.findFirst>>;
type Capturer2 = { id: string; name: string; avatarColor: string } | undefined;

/** One database row → the shape the bin and trash views render. */
function toBinRow(r: NonNullable<BinRecord>, capturer: Capturer2): ContentBinRow {
  return {
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
    createdBy: capturer ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

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

  const items: ContentBinRow[] = rows.map((r) => toBinRow(r, userById.get(r.createdById)));

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

export type StorageUsage = { total: number; active: number; trashed: number };

// Bytes stored for the workspace, split into active media vs. trashed (still
// occupying R2 until the 30-day purge). Sums each media asset's original file
// size, so it reflects the real storage footprint.
export async function getStorageUsage(workspaceId: string): Promise<StorageUsage> {
  const [active, trashed] = await Promise.all([
    prisma.mediaAsset.aggregate({
      where: { workspaceId, deletedAt: null },
      _sum: { sizeBytes: true },
    }),
    prisma.mediaAsset.aggregate({
      where: { workspaceId, deletedAt: { not: null } },
      _sum: { sizeBytes: true },
    }),
  ]);
  const a = active._sum.sizeBytes ?? 0;
  const t = trashed._sum.sizeBytes ?? 0;
  return { total: a + t, active: a, trashed: t };
}

// ── Task pipeline ────────────────────────────────────────────────────────────
// The production workflow (Content Overview → Content/Video/Graphics →
// Publishing → Analytics). See src/lib/tasks.ts for the stage config.

export type TaskStageRow = {
  id: string;
  stage: string;
  order: number;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  targetDate: string | null;
  workStatus: string;
  reviewStatus: string;
  publishable: boolean;
  submittedAt: string | null;
  completedDate: string | null;
  reviewNote: string | null;
  remarks: string;
};

export type TaskRow = {
  id: string;
  title: string;
  brief: string;
  content: string;
  remarks: string;
  contentType: string;
  contentTypeLabel: string;
  channel: { id: string; name: string; icon: string; color: string } | null;
  account: { id: string; name: string; icon: string; color: string } | null;
  weekLabel: string;
  plannedDate: string | null;
  currentStage: string;
  publishStatus: string;
  scheduledPublishDate: string | null;
  publishedDate: string | null;
  delayReason: string | null;
  publisherId: string | null;
  analystId: string | null;
  contentLink: string | null;
  metricClicks: number | null;
  metricLeads: number | null;
  metricEng: number | null;
  metricImpressions: number | null;
  metricReach: number | null;
  metricSaves: number | null;
  metricShares: number | null;
  metricsNote: string | null;
  binItemId: string | null;
  assets: { id: string; title: string; thumbnailUrl: string | null; type: string; filename: string | null; stageId: string | null }[];
  createdAt: string;
  stages: TaskStageRow[];
};

export type TaskFilters = {
  stage?: string; // currentStage / board column
  contentType?: string;
  accountId?: string;
  channelId?: string;
  assigneeId?: string; // tasks with a stage owned by this user
  publishStatus?: string;
  week?: string;
  q?: string;
};

export async function listTasks(
  workspaceId: string,
  filters: TaskFilters = {},
): Promise<TaskRow[]> {
  const rows = await prisma.task.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(filters.stage ? { currentStage: filters.stage } : {}),
      ...(filters.contentType ? { contentType: filters.contentType } : {}),
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.channelId ? { channelId: filters.channelId } : {}),
      ...(filters.publishStatus ? { publishStatus: filters.publishStatus } : {}),
      ...(filters.week ? { weekLabel: filters.week } : {}),
      ...(filters.assigneeId ? { stages: { some: { assigneeId: filters.assigneeId } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      stages: { orderBy: { order: "asc" } },
      assets: {
        select: { stageId: true, asset: { select: { id: true, title: true, thumbnailUrl: true, type: true, filename: true } } },
      },
    },
  });

  // Resolve platform/account/assignee labels in bulk (channelId/accountId are
  // plain string columns, not relations; assignees are login users).
  const [channels, accounts, users] = await Promise.all([
    prisma.socialChannel.findMany({
      where: { workspaceId },
      select: { id: true, name: true, icon: true, color: true },
    }),
    prisma.account.findMany({
      where: { workspaceId },
      select: { id: true, name: true, icon: true, color: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true, avatarColor: true } }),
  ]);
  const chById = new Map(channels.map((c) => [c.id, c]));
  const acById = new Map(accounts.map((a) => [a.id, a]));
  const usById = new Map(users.map((u) => [u.id, u]));

  const items: TaskRow[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    brief: t.brief,
    content: t.content,
    remarks: t.remarks,
    contentType: t.contentType,
    contentTypeLabel: contentTypeLabel(t.contentType),
    channel: (t.channelId && chById.get(t.channelId)) || null,
    account: (t.accountId && acById.get(t.accountId)) || null,
    weekLabel: t.weekLabel,
    plannedDate: t.plannedDate ? t.plannedDate.toISOString() : null,
    currentStage: t.currentStage,
    publishStatus: t.publishStatus,
    scheduledPublishDate: t.scheduledPublishDate ? t.scheduledPublishDate.toISOString() : null,
    publishedDate: t.publishedDate ? t.publishedDate.toISOString() : null,
    delayReason: t.delayReason,
    publisherId: t.publisherId,
    analystId: t.analystId,
    contentLink: t.contentLink,
    metricClicks: t.metricClicks,
    metricLeads: t.metricLeads,
    metricEng: t.metricEng,
    metricImpressions: t.metricImpressions,
    metricReach: t.metricReach,
    metricSaves: t.metricSaves,
    metricShares: t.metricShares,
    metricsNote: t.metricsNote,
    binItemId: t.binItemId,
    assets: t.assets.map((a) => ({ ...a.asset, stageId: a.stageId })),
    createdAt: t.createdAt.toISOString(),
    stages: t.stages.map((s) => {
      const u = s.assigneeId ? usById.get(s.assigneeId) : null;
      const rv = s.reviewerId ? usById.get(s.reviewerId) : null;
      return {
        id: s.id,
        stage: s.stage,
        order: s.order,
        assigneeId: s.assigneeId,
        assigneeName: u?.name ?? null,
        assigneeColor: u?.avatarColor ?? null,
        reviewerId: s.reviewerId,
        reviewerName: rv?.name ?? null,
        targetDate: s.targetDate ? s.targetDate.toISOString() : null,
        workStatus: s.workStatus,
        reviewStatus: s.reviewStatus,
        publishable: s.publishable,
        submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
        completedDate: s.completedDate ? s.completedDate.toISOString() : null,
        reviewNote: s.reviewNote,
        remarks: s.remarks,
      };
    }),
  }));

  const q = filters.q?.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.brief.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q),
  );
}

/** Open tasks assigned to a user (their My Work badge) — stages they own that
 * aren't yet approved. */
export async function getMyOpenTaskCount(workspaceId: string, userId: string): Promise<number> {
  return prisma.task.count({
    where: {
      workspaceId,
      deletedAt: null,
      stages: { some: { assigneeId: userId, reviewStatus: { not: "APPROVED" } } },
    },
  });
}

/** Stages awaiting admin review (the To-review badge). */
export async function getPendingReviewCount(workspaceId: string): Promise<number> {
  return prisma.task.count({
    where: {
      workspaceId,
      deletedAt: null,
      stages: { some: { reviewStatus: "PENDING" } },
    },
  });
}

export type MemberOverviewRow = {
  userId: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl: string | null;
  role: string;
  total: number;
  completedOnTime: number;
  completedDelay: number;
  inProgress: number; // WIP (on track or delayed)
  notStarted: number; // yet to initiate
};

// Per-member task workload: counts of stages assigned to each member, grouped
// by work status, over an optional planned-date window. Powers the Members
// overview tiles.
export async function getMembersOverview(
  workspaceId: string,
  range: { from?: string; to?: string } = {},
): Promise<MemberOverviewRow[]> {
  const plannedDate: { gte?: Date; lte?: Date } = {};
  if (range.from) plannedDate.gte = new Date(range.from);
  if (range.to) {
    const end = new Date(range.to);
    end.setHours(23, 59, 59, 999);
    plannedDate.lte = end;
  }
  const stages = await prisma.taskStage.findMany({
    where: {
      assigneeId: { not: null },
      task: {
        workspaceId,
        deletedAt: null,
        ...(range.from || range.to ? { plannedDate } : {}),
      },
    },
    select: { assigneeId: true, workStatus: true },
  });

  const members = await listMembers(workspaceId);
  const byUser = new Map<string, MemberOverviewRow>();
  for (const m of members) {
    byUser.set(m.userId, {
      userId: m.userId, name: m.name, email: m.email, avatarColor: m.avatarColor, avatarUrl: m.avatarUrl,
      role: m.role, total: 0, completedOnTime: 0, completedDelay: 0, inProgress: 0, notStarted: 0,
    });
  }
  for (const s of stages) {
    const row = s.assigneeId ? byUser.get(s.assigneeId) : undefined;
    if (!row) continue;
    row.total++;
    if (s.workStatus === "COMPLETED_ON_TIME") row.completedOnTime++;
    else if (s.workStatus === "COMPLETED_DELAY") row.completedDelay++;
    else if (s.workStatus === "WIP_ON_TRACK" || s.workStatus === "WIP_DELAY") row.inProgress++;
    else row.notStarted++;
  }
  return [...byUser.values()];
}

// Tasks ready to publish: every stage approved, not live yet. Counted as TASKS
// (the unit you publish), matching the Ready-to-publish list.
export async function getReadyToPublishCount(workspaceId: string): Promise<number> {
  return prisma.task.count({
    where: {
      workspaceId,
      deletedAt: null,
      publishStatus: { notIn: ["PUBLISHED_ON_TIME", "PUBLISHED_DELAY"] },
      stages: { some: {}, every: { reviewStatus: "APPROVED" } },
    },
  });
}

// Tasks with at least one stage sent back for rework (awaiting re-submit).
export async function getTaskReworkCount(workspaceId: string): Promise<number> {
  return prisma.task.count({
    where: {
      workspaceId,
      deletedAt: null,
      stages: { some: { reviewStatus: "REWORK" } },
    },
  });
}

/** Dropdown data for the task views: assignable members (login users) +
 * platforms + accounts. */
export async function getTaskOptions(workspaceId: string) {
  const [members, channels, accounts, taskTypes, people] = await Promise.all([
    listMembers(workspaceId),
    prisma.socialChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.account.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true },
    }),
    prisma.taskType.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    // Designations come from the member's linked Person record (its label).
    prisma.person.findMany({
      where: { workspaceId, deletedAt: null, userId: { not: null } },
      select: { userId: true, label: true },
    }),
  ]);
  const labelByUser = new Map(people.map((p) => [p.userId!, p.label ?? ""]));
  return {
    members: members
      .filter((m) => !m.disabled)
      .map((m) => ({
        id: m.userId,
        name: m.name,
        avatarColor: m.avatarColor,
        role: labelByUser.get(m.userId) || "",
      })),
    channels,
    accounts,
    taskTypes,
  };
}

/**
 * Every number the app shell needs, in a single database round trip.
 *
 * The layout renders on every request (it's force-dynamic) and used to call ten
 * separate queries to fill in the sidebar badges and the storage gauge. Over a
 * long-haul link to the database that's ten chances to pay the latency; folded
 * into one statement it's one. Same shape as the individual helpers below, which
 * stay for the pages that need them on their own.
 */
export type SidebarCounts = {
  assets: Record<LibraryViewKey, number>;
  bin: number;
  myTasks: number;
  taskReview: number;
  taskRework: number;
  members: number;
  ready: number;
  unread: number;
  storage: StorageUsage;
};

type CountsRow = {
  bin: bigint;
  my_tasks: bigint;
  task_review: bigint;
  task_rework: bigint;
  ready: bigint;
  members: bigint;
  unread: bigint;
  storage_active: bigint | null;
  storage_trashed: bigint | null;
  asset_types: Record<string, number> | null;
};

export async function getSidebarCounts(
  workspaceId: string,
  userId: string,
): Promise<SidebarCounts> {
  const [row] = await prisma.$queryRaw<CountsRow[]>`
    SELECT
      (SELECT COUNT(*) FROM "ContentBinItem"
         WHERE "workspaceId" = ${workspaceId} AND "deletedAt" IS NULL
           AND "status" <> 'DISCARDED') AS bin,
      (SELECT COUNT(*) FROM "Task" t
         WHERE t."workspaceId" = ${workspaceId} AND t."deletedAt" IS NULL
           AND EXISTS (SELECT 1 FROM "TaskStage" s
                        WHERE s."taskId" = t."id" AND s."assigneeId" = ${userId}
                          AND s."reviewStatus" <> 'APPROVED')) AS my_tasks,
      (SELECT COUNT(*) FROM "Task" t
         WHERE t."workspaceId" = ${workspaceId} AND t."deletedAt" IS NULL
           AND EXISTS (SELECT 1 FROM "TaskStage" s
                        WHERE s."taskId" = t."id" AND s."reviewStatus" = 'PENDING')) AS task_review,
      (SELECT COUNT(*) FROM "Task" t
         WHERE t."workspaceId" = ${workspaceId} AND t."deletedAt" IS NULL
           AND EXISTS (SELECT 1 FROM "TaskStage" s
                        WHERE s."taskId" = t."id" AND s."reviewStatus" = 'REWORK')) AS task_rework,
      -- Every stage approved and at least one stage, not yet published.
      (SELECT COUNT(*) FROM "Task" t
         WHERE t."workspaceId" = ${workspaceId} AND t."deletedAt" IS NULL
           AND t."publishStatus" NOT IN ('PUBLISHED_ON_TIME', 'PUBLISHED_DELAY')
           AND EXISTS (SELECT 1 FROM "TaskStage" s WHERE s."taskId" = t."id")
           AND NOT EXISTS (SELECT 1 FROM "TaskStage" s
                            WHERE s."taskId" = t."id"
                              AND s."reviewStatus" <> 'APPROVED')) AS ready,
      (SELECT COUNT(*) FROM "Membership" WHERE "workspaceId" = ${workspaceId}) AS members,
      (SELECT COUNT(*) FROM "Notification"
         WHERE "recipientId" = ${userId} AND "readAt" IS NULL) AS unread,
      (SELECT COALESCE(SUM("sizeBytes"), 0) FROM "MediaAsset"
         WHERE "workspaceId" = ${workspaceId} AND "deletedAt" IS NULL) AS storage_active,
      (SELECT COALESCE(SUM("sizeBytes"), 0) FROM "MediaAsset"
         WHERE "workspaceId" = ${workspaceId} AND "deletedAt" IS NOT NULL) AS storage_trashed,
      (SELECT COALESCE(json_object_agg("type", c), '{}'::json)
         FROM (SELECT "type", COUNT(*) AS c FROM "MediaAsset"
                WHERE "workspaceId" = ${workspaceId} AND "deletedAt" IS NULL
                GROUP BY "type") x) AS asset_types
  `;

  const byType = new Map(Object.entries(row?.asset_types ?? {}));
  const assets = {} as Record<LibraryViewKey, number>;
  for (const view of LIBRARY_VIEWS) {
    assets[view.key] = view.types.reduce((n, t) => n + Number(byType.get(t) ?? 0), 0);
  }
  const active = Number(row?.storage_active ?? 0);
  const trashed = Number(row?.storage_trashed ?? 0);

  return {
    assets,
    bin: Number(row?.bin ?? 0),
    myTasks: Number(row?.my_tasks ?? 0),
    taskReview: Number(row?.task_review ?? 0),
    taskRework: Number(row?.task_rework ?? 0),
    members: Number(row?.members ?? 0),
    ready: Number(row?.ready ?? 0),
    unread: Number(row?.unread ?? 0),
    storage: { total: active + trashed, active, trashed },
  };
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

// The dashboard is task-based: every figure describes work in the pipeline.
// (Top creators stays asset-based — it credits who produced the media.)
export type DashboardData = {
  totalTasks: number;
  taskCounts: {
    inProgress: number;
    toReview: number;
    inRework: number;
    ready: number;
    published: number;
  };
  // Most recently published work — what actually went out.
  latest: {
    id: string;
    title: string;
    accountName: string | null;
    platformName: string;
    platformIcon: string;
    platformColor: string;
    date: string;
  }[];
  topCreators: { name: string; avatarColor: string; assetCount: number }[];
};

/**
 * Pure dashboard aggregation — deterministic given `now`, so it's unit-testable.
 * When a `range` is supplied (the dashboard's date filter), the "scheduled"
 * window is that range; otherwise it's the calendar month of `now`.
 */
export type DashTask = {
  id: string;
  title: string;
  contentTypeLabel: string;
  channelId: string | null;
  accountName: string | null;
  currentStage: string;
  publishStatus: string;
  publishedDate: string | null;
  scheduledPublishDate: string | null;
  stages: { reviewStatus: string }[];
};

/**
 * Roll tasks up into the dashboard. Pure + `now`-injectable so it's testable.
 */
export function aggregateDashboard(
  tasks: DashTask[],
  channels: DashChannel[],
  creators: Pick<CreatorRow, "name" | "avatarColor" | "assetCount">[],
): DashboardData {
  const isPublished = (t: DashTask) => t.publishStatus.startsWith("PUBLISHED");
  const allApproved = (t: DashTask) =>
    t.stages.length > 0 && t.stages.every((s) => s.reviewStatus === "APPROVED");

  const live = tasks.filter((t) => !isPublished(t));
  const taskCounts = {
    // Work still being produced: nothing submitted or sent back yet.
    inProgress: live.filter(
      (t) =>
        !allApproved(t) &&
        !t.stages.some((s) => s.reviewStatus === "PENDING" || s.reviewStatus === "REWORK"),
    ).length,
    toReview: live.filter((t) => t.stages.some((s) => s.reviewStatus === "PENDING")).length,
    inRework: live.filter((t) => t.stages.some((s) => s.reviewStatus === "REWORK")).length,
    ready: live.filter(allApproved).length,
    published: tasks.filter(isPublished).length,
  };

  const chById = new Map(channels.map((c) => [c.id, c]));
  const latest = tasks
    .filter(isPublished)
    .sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""))
    .slice(0, 8)
    .map((t) => {
      const ch = t.channelId ? chById.get(t.channelId) : undefined;
      return {
        id: t.id,
        title: t.title,
        accountName: t.accountName,
        platformName: ch?.name ?? "No platform",
        platformIcon: ch?.icon ?? "✨",
        platformColor: ch?.color ?? "#889",
        date: t.publishedDate ?? "",
      };
    });

  const topCreators = [...creators]
    .filter((c) => c.assetCount > 0) // no point ranking creators with nothing
    .sort((a, b) => b.assetCount - a.assetCount)
    .slice(0, 6)
    .map((c) => ({ name: c.name, avatarColor: c.avatarColor, assetCount: c.assetCount }));

  return { totalTasks: tasks.length, taskCounts, latest, topCreators };
}

export async function getDashboardData(
  workspaceId: string,
  opts: { from?: string; to?: string } = {},
): Promise<DashboardData> {
  const range = createdAtRange(opts.from, opts.to);
  const [tasks, channels, creators, accounts] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId, deletedAt: null, ...(range ? { createdAt: range } : {}) },
      select: {
        id: true,
        title: true,
        contentType: true,
        channelId: true,
        currentStage: true,
        publishStatus: true,
        publishedDate: true,
        scheduledPublishDate: true,
        accountId: true,
        stages: { select: { reviewStatus: true } },
      },
    }),
    prisma.socialChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    listCreators(workspaceId),
    prisma.account.findMany({ where: { workspaceId }, select: { id: true, name: true } }),
  ]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  const input: DashTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    contentTypeLabel: contentTypeLabel(t.contentType),
    channelId: t.channelId,
    accountName: t.accountId ? accountName.get(t.accountId) ?? null : null,
    currentStage: t.currentStage,
    publishStatus: t.publishStatus,
    publishedDate: t.publishedDate ? t.publishedDate.toISOString() : null,
    scheduledPublishDate: t.scheduledPublishDate ? t.scheduledPublishDate.toISOString() : null,
    stages: t.stages.map((s) => ({ reviewStatus: s.reviewStatus })),
  }));

  return aggregateDashboard(input, channels, creators);
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
      ...(filters.publishableOnly ? { publishable: true } : {}),
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
