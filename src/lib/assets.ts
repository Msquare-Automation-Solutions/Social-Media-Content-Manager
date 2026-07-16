import type { MediaAsset } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeTags, serializeJson } from "@/lib/json";
import type { SaveAssetInput } from "@/lib/validation/save-asset";
import { hasRole } from "@/lib/roles";
import type { Role } from "@/lib/enums";

/**
 * Who may mutate (edit / delete / restore) an asset:
 *   ADMIN+ → any asset in the workspace
 *   EDITOR → assets they created OR are the assigned owner of (the asset's
 *            Person is linked to their user) — so reassigning someone else's
 *            content to you grants edit access, including the thumbnail.
 *   VIEWER → none
 */
export function canMutateAsset(
  actor: { id: string; role: Role },
  asset: { createdById: string; person?: { userId: string | null } | null },
): boolean {
  if (hasRole(actor.role, "ADMIN")) return true;
  const isOwner =
    asset.createdById === actor.id || asset.person?.userId === actor.id;
  if (actor.role === "EDITOR") return isOwner;
  return false;
}

// ── Version snapshots ───────────────────────────────────────────────────────
// A snapshot is written BEFORE every asset edit (spec, non-negotiable).

/** Pure: the JSON we store in AssetVersion.snapshotJson. */
export function assetSnapshot(
  asset: Pick<
    MediaAsset,
    | "title"
    | "type"
    | "personId"
    | "tags"
    | "html"
    | "url"
    | "thumbnailUrl"
    | "filename"
    | "mimeType"
    | "sizeBytes"
    | "source"
  >,
  channels: { channelId: string; scheduledFor: string | null }[],
  accountIds: string[] = [],
): Record<string, unknown> {
  return {
    title: asset.title,
    type: asset.type,
    personId: asset.personId,
    tags: asset.tags,
    html: asset.html,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    filename: asset.filename,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    source: asset.source,
    channels,
    accountIds,
  };
}

/** Write an AssetVersion snapshot of the asset's CURRENT state. */
export async function snapshotAsset(assetId: string, editedById: string) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: { channels: true, accounts: true },
  });
  if (!asset) throw new Error("Asset not found");
  return prisma.assetVersion.create({
    data: {
      assetId,
      editedById,
      snapshotJson: serializeJson(
        assetSnapshot(
          asset,
          asset.channels.map((c) => ({
            channelId: c.channelId,
            scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
          })),
          asset.accounts.map((a) => a.accountId),
        ),
      ),
    },
  });
}

/** Apply a stored snapshot back onto the asset (used by version restore). */
export async function applySnapshot(
  assetId: string,
  snapshot: Record<string, unknown>,
) {
  // New snapshots store `channels: [{channelId, scheduledFor}]`; older ones used
  // a plain `channelIds: string[]`.
  const channels: { channelId: string; scheduledFor: string | null }[] =
    Array.isArray(snapshot.channels)
      ? (snapshot.channels as { channelId: string; scheduledFor: string | null }[])
      : Array.isArray(snapshot.channelIds)
        ? (snapshot.channelIds as string[]).map((channelId) => ({
            channelId,
            scheduledFor: null,
          }))
        : [];
  await prisma.mediaAsset.update({
    where: { id: assetId },
    data: {
      title: String(snapshot.title ?? ""),
      type: String(snapshot.type ?? "BLOGPOST"),
      personId: String(snapshot.personId ?? ""),
      tags: String(snapshot.tags ?? "[]"),
      html: (snapshot.html as string | null) ?? null,
      url: (snapshot.url as string | null) ?? null,
      thumbnailUrl: (snapshot.thumbnailUrl as string | null) ?? null,
      filename: (snapshot.filename as string | null) ?? null,
      mimeType: (snapshot.mimeType as string | null) ?? null,
      sizeBytes: (snapshot.sizeBytes as number | null) ?? null,
      source: String(snapshot.source ?? "GENERATED"),
    },
  });
  await prisma.assetChannel.deleteMany({ where: { assetId } });
  if (channels.length) {
    await prisma.assetChannel.createMany({
      data: channels.map((c) => ({
        assetId,
        channelId: c.channelId,
        scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : null,
      })),
    });
  }
  // Accounts (added in a later version of the snapshot; older ones omit them).
  const accountIds = Array.isArray(snapshot.accountIds)
    ? (snapshot.accountIds as string[])
    : [];
  await prisma.assetAccount.deleteMany({ where: { assetId } });
  if (accountIds.length) {
    await prisma.assetAccount.createMany({
      data: accountIds.map((accountId) => ({ assetId, accountId })),
    });
  }
}

// ── Creation ────────────────────────────────────────────────────────────────

export type CreateAssetArgs = SaveAssetInput & {
  thumbnailUrl: string;
  url?: string | null;
};

/**
 * Create a MediaAsset from validated Save-dialog input. Enforces that the
 * chosen person + channels actually belong to the caller's workspace.
 */
export async function createAsset(
  args: CreateAssetArgs,
  ctx: { workspaceId: string; userId: string },
) {
  const person = await prisma.person.findFirst({
    where: { id: args.personId, workspaceId: ctx.workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!person) throw new Error("Person not in workspace");

  const ids = args.channels.map((c) => c.channelId);
  const valid = await prisma.socialChannel.findMany({
    where: { id: { in: ids }, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (valid.length !== ids.length) {
    throw new Error("One or more platforms not in workspace");
  }

  const accountIds = await validAccountIds(args.accountIds, ctx.workspaceId);

  return prisma.mediaAsset.create({
    data: {
      workspaceId: ctx.workspaceId,
      personId: args.personId,
      createdById: ctx.userId,
      type: args.type,
      title: args.title,
      source: args.source,
      tags: serializeTags(args.tags),
      note: args.note ?? null,
      html: args.html ?? null,
      url: args.url ?? null,
      thumbnailUrl: args.thumbnailUrl,
      filename: args.filename ?? null,
      mimeType: args.mimeType ?? null,
      sizeBytes: args.sizeBytes ?? null,
      chatMessageId: args.chatMessageId ?? null,
      channels: {
        create: args.channels.map((c) => ({
          channelId: c.channelId,
          scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : null,
        })),
      },
      accounts: { create: accountIds.map((accountId) => ({ accountId })) },
    },
    select: { id: true, type: true, title: true },
  });
}

/** Filter the requested account ids down to ones in this workspace (ignoring
 *  archived/foreign ids), preserving order and de-duping. */
export async function validAccountIds(
  requested: string[] | undefined,
  workspaceId: string,
): Promise<string[]> {
  const unique = [...new Set(requested ?? [])];
  if (unique.length === 0) return [];
  const rows = await prisma.account.findMany({
    where: { id: { in: unique }, workspaceId, deletedAt: null },
    select: { id: true },
  });
  const ok = new Set(rows.map((r) => r.id));
  return unique.filter((id) => ok.has(id));
}
