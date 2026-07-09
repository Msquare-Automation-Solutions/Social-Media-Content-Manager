import { prisma } from "@/lib/db";
import { LIBRARY_VIEWS, typesForView, type LibraryViewKey } from "@/lib/library";
import { parseTags, parseJson } from "@/lib/json";
import { describeActivity } from "@/lib/activity-format";

export type LibraryFilters = {
  personId?: string;
  channelId?: string;
  q?: string;
  sort?: "newest" | "name" | "postdate";
};

export type AssetListItem = {
  id: string;
  title: string;
  type: string;
  source: string;
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
  opts: { actorId?: string; category?: string; cursor?: string; take?: number } = {},
): Promise<ActivityRow[]> {
  const rows = await prisma.activityLog.findMany({
    where: {
      workspaceId,
      ...(opts.actorId ? { actorId: opts.actorId } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
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
