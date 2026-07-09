import { prisma } from "@/lib/db";
import { LIBRARY_VIEWS, typesForView, type LibraryViewKey } from "@/lib/library";
import { parseTags, parseJson } from "@/lib/json";
import { describeActivity } from "@/lib/activity-format";

export type LibraryFilters = {
  personId?: string;
  channelId?: string;
  status?: string;
  q?: string;
  sort?: "newest" | "name" | "postdate";
};

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
  person: { id: string; name: string; avatarColor: string };
  channels: {
    id: string;
    name: string;
    icon: string;
    color: string;
    scheduledFor: string | null;
  }[];
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
    where: { workspaceId },
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
export type StatusCounts = { IN_QUEUE: number; REWORK: number; APPROVED: number };

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
    IN_QUEUE: assets.filter((a) => a.status === "IN_QUEUE").length,
    REWORK: assets.filter((a) => a.status === "REWORK").length,
    APPROVED: assets.filter((a) => a.status === "APPROVED").length,
  };
}

/** Pure dashboard aggregation — deterministic given `now`, so it's unit-testable. */
export function aggregateDashboard(
  assets: DashAsset[],
  channels: DashChannel[],
  creators: Pick<CreatorRow, "name" | "avatarColor" | "assetCount">[],
  now: Date,
): DashboardData {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const inMonth = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= monthStart && d < monthEnd;
  };
  // # of assets with at least one platform post date this month.
  const scheduledThisMonth = (list: DashAsset[]) =>
    list.filter((a) => a.channels.some((c) => inMonth(c.scheduledFor))).length;

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
      // Post dates for *this* platform specifically.
      scheduledThisMonth: tagged.filter((a) =>
        a.channels.some((c) => c.channelId === ch.id && inMonth(c.scheduledFor)),
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
    byType: typeBreakdown(assets),
    perPlatform,
    upcoming,
    topCreators,
  };
}

/** Workspace-wide analytics for the dashboard page (visible to everyone). */
export async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const [assets, channels, creators] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { workspaceId, deletedAt: null },
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

  return aggregateDashboard(input, channels, creators, new Date());
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
    },
    orderBy: { createdAt: "desc" },
    include: {
      person: { select: { id: true, name: true, avatarColor: true } },
      channels: {
        include: {
          channel: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      },
    },
  });

  let items: AssetListItem[] = rows.map((a) => {
    const channels = a.channels.map((c) => ({
      ...c.channel,
      scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
    }));
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
    };
  });

  // Case-insensitive title/tag search + sort, in-memory (workspace is small).
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  if (filters.sort === "name") {
    items.sort((a, b) => a.title.localeCompare(b.title));
  } else if (filters.sort === "postdate") {
    // Assets with a post date first (soonest → latest); undated last.
    items.sort((a, b) => {
      if (!a.nextPostDate && !b.nextPostDate) return 0;
      if (!a.nextPostDate) return 1;
      if (!b.nextPostDate) return -1;
      return a.nextPostDate.localeCompare(b.nextPostDate);
    });
  }
  return items;
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
