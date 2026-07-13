import crypto from "crypto";
import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { snapshotAsset, canMutateAsset } from "@/lib/assets";
import { isAdminRole } from "@/lib/roles";
import { serializeTags, parseTags } from "@/lib/json";
import { storage, keyFromUrl } from "@/lib/storage";
import { makeImageThumbnail, thumbKey } from "@/lib/thumbnails";
import { ASSET_TYPES } from "@/lib/enums";
import { TYPE_LABELS } from "@/lib/library";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadOwned(id: string, workspaceId: string) {
  return prisma.mediaAsset.findFirst({
    where: { id, workspaceId },
    include: {
      person: { select: { id: true, name: true, avatarColor: true, userId: true } },
      channels: { include: { channel: true } },
      _count: { select: { versions: true } },
    },
  });
}

// ── Detail (drawer / reader) ────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (!g.ok) return g.response;

  const a = await loadOwned((await params).id, g.user.workspaceId);
  if (!a || a.deletedAt) return new Response("Not found", { status: 404 });

  return Response.json({
    id: a.id,
    title: a.title,
    type: a.type,
    source: a.source,
    html: a.html,
    url: a.url,
    thumbnailUrl: a.thumbnailUrl,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    tags: parseTags(a.tags),
    note: a.note,
    status: a.status,
    reviewNote: a.reviewNote,
    reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    person: a.person,
    channels: a.channels.map((c) => ({
      ...c.channel,
      scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
    })),
    channelIds: a.channels.map((c) => c.channelId),
    versionCount: a._count.versions,
    canEdit: canMutateAsset(g.user, a),
    // Publish workflow (Part C): the creator of an item or any admin may mark an
    // APPROVED item PUBLISHED; only admins can undo a publish back to APPROVED.
    canPublish:
      a.status === "APPROVED" && (isAdminRole(g.user.role) || a.createdById === g.user.id),
    canUnpublish: a.status === "PUBLISHED" && isAdminRole(g.user.role),
  });
}

// ── Edit (snapshot first) + optional file replace ───────────────────────────
const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  type: z.enum(ASSET_TYPES).optional(),
  personId: z.string().min(1).optional(),
  channels: z
    .array(
      z.object({
        channelId: z.string().min(1),
        scheduledFor: z.string().datetime().nullish().or(z.literal("")),
      }),
    )
    .min(1)
    .optional(),
  tags: z.array(z.string().trim().min(1)).max(30).optional(),
  note: z.string().trim().max(2000).nullish(),
  html: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
    include: { person: { select: { userId: true } } },
  });
  if (!asset || asset.deletedAt) return new Response("Not found", { status: 404 });
  if (!canMutateAsset(g.user, asset)) return new Response("Forbidden", { status: 403 });

  const contentType = req.headers.get("content-type") || "";
  const data: Record<string, unknown> = {};
  let fileReplace: File | null = null;
  let parsedBody: z.infer<typeof patchSchema>;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const raw = form.get("payload");
    parsedBody = patchSchema.parse(raw ? JSON.parse(String(raw)) : {});
    const f = form.get("file");
    if (f instanceof File) fileReplace = f;
  } else {
    parsedBody = patchSchema.parse(await req.json());
  }

  // Snapshot the CURRENT state before mutating (spec: non-negotiable).
  await snapshotAsset(asset.id, g.user.id);

  if (parsedBody.title !== undefined) data.title = parsedBody.title;
  if (parsedBody.type !== undefined) data.type = parsedBody.type;
  if (parsedBody.html !== undefined) data.html = parsedBody.html;
  if (parsedBody.tags !== undefined) data.tags = serializeTags(parsedBody.tags);
  if (parsedBody.note !== undefined) data.note = parsedBody.note || null;

  if (parsedBody.personId !== undefined) {
    const person = await prisma.person.findFirst({
      where: { id: parsedBody.personId, workspaceId: g.user.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!person) return new Response("Person not in workspace", { status: 400 });
    data.personId = parsedBody.personId;
  }

  // Replace file → store new, keep old (already captured in the snapshot).
  if (fileReplace) {
    const buf = Buffer.from(await fileReplace.arrayBuffer());
    const keyBase = thumbKey(String(data.title ?? asset.title), crypto.randomUUID());
    const ext = fileReplace.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? "";
    data.url = await storage.save(
      `files/${keyBase}${ext ? "." + ext : ""}`,
      buf,
      fileReplace.type || "application/octet-stream",
    );
    data.filename = fileReplace.name;
    data.mimeType = fileReplace.type;
    data.sizeBytes = buf.length;
    if (fileReplace.type.startsWith("image/")) {
      data.thumbnailUrl = await makeImageThumbnail(buf, keyBase);
    }
  }

  // Any content edit resubmits the item for review (back to Pending approval).
  data.status = "PENDING";
  data.reviewNote = null;
  data.reviewedAt = null;

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data,
  });

  // Update channel links (+ per-platform post dates) if provided.
  if (parsedBody.channels) {
    const ids = parsedBody.channels.map((c) => c.channelId);
    const valid = await prisma.socialChannel.findMany({
      where: { id: { in: ids }, workspaceId: g.user.workspaceId },
      select: { id: true },
    });
    const validIds = new Set(valid.map((c) => c.id));
    await prisma.assetChannel.deleteMany({ where: { assetId: asset.id } });
    await prisma.assetChannel.createMany({
      data: parsedBody.channels
        .filter((c) => validIds.has(c.channelId))
        .map((c) => ({
          assetId: asset.id,
          channelId: c.channelId,
          scheduledFor: c.scheduledFor ? new Date(c.scheduledFor) : null,
        })),
    });
  }

  await logActivity(g.user, {
    action: "asset.updated",
    targetType: (TYPE_LABELS[updated.type] ?? updated.type).toLowerCase(),
    targetId: updated.id,
    targetLabel: updated.title,
  });
  return Response.json({ id: updated.id, type: updated.type, title: updated.title });
}

// ── Soft delete ─────────────────────────────────────────────────────────────
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
    include: { person: { select: { userId: true } } },
  });
  if (!asset || asset.deletedAt) return new Response("Not found", { status: 404 });
  if (!canMutateAsset(g.user, asset)) return new Response("Forbidden", { status: 403 });

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { deletedAt: new Date() },
  });
  void keyFromUrl; // storage cleanup happens on permanent trash purge (Phase 6)
  await logActivity(g.user, {
    action: "asset.deleted",
    targetType: (TYPE_LABELS[asset.type] ?? asset.type).toLowerCase(),
    targetId: asset.id,
    targetLabel: asset.title,
  });
  return Response.json({ ok: true });
}
