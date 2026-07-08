import type { MediaAsset } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeTags, serializeJson } from "@/lib/json";
import type { SaveAssetInput } from "@/lib/validation/save-asset";
import { hasRole } from "@/lib/roles";
import type { Role } from "@/lib/enums";

/**
 * Who may mutate (edit / delete / restore) an asset:
 *   ADMIN+ → any asset in the workspace
 *   EDITOR → only assets they created
 *   VIEWER → none
 */
export function canMutateAsset(
  actor: { id: string; role: Role },
  asset: { createdById: string },
): boolean {
  if (hasRole(actor.role, "ADMIN")) return true;
  if (actor.role === "EDITOR") return asset.createdById === actor.id;
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
  channelIds: string[],
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
    channelIds,
  };
}

/** Write an AssetVersion snapshot of the asset's CURRENT state. */
export async function snapshotAsset(assetId: string, editedById: string) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: { channels: true },
  });
  if (!asset) throw new Error("Asset not found");
  return prisma.assetVersion.create({
    data: {
      assetId,
      editedById,
      snapshotJson: serializeJson(
        assetSnapshot(
          asset,
          asset.channels.map((c) => c.channelId),
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
  const channelIds = Array.isArray(snapshot.channelIds)
    ? (snapshot.channelIds as string[])
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
  if (channelIds.length) {
    await prisma.assetChannel.createMany({
      data: channelIds.map((channelId) => ({ assetId, channelId })),
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
    where: { id: args.personId, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!person) throw new Error("Person not in workspace");

  const channels = await prisma.socialChannel.findMany({
    where: { id: { in: args.channelIds }, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (channels.length !== args.channelIds.length) {
    throw new Error("One or more platforms not in workspace");
  }

  return prisma.mediaAsset.create({
    data: {
      workspaceId: ctx.workspaceId,
      personId: args.personId,
      createdById: ctx.userId,
      type: args.type,
      title: args.title,
      source: args.source,
      tags: serializeTags(args.tags),
      html: args.html ?? null,
      url: args.url ?? null,
      thumbnailUrl: args.thumbnailUrl,
      filename: args.filename ?? null,
      mimeType: args.mimeType ?? null,
      sizeBytes: args.sizeBytes ?? null,
      chatMessageId: args.chatMessageId ?? null,
      channels: {
        create: channels.map((c) => ({ channelId: c.id })),
      },
    },
    select: { id: true, type: true, title: true },
  });
}
