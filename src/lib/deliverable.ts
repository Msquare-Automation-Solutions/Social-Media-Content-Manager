import { prisma } from "@/lib/db";
import { serializeTags } from "@/lib/json";

/**
 * A task's stages each hand in their own file (copy from Content, a thumbnail
 * from Graphics, a cut from Video…). Publishing each of those separately makes
 * the Approved panel very wide, so instead every task gets ONE consolidated
 * deliverable: a single MediaAsset that bundles all the stage files as parts.
 *
 * It's maintained automatically:
 *   - it appears (status APPROVED, publishable) only once EVERY stage of the
 *     task is approved, so the Approved panel holds one row per task,
 *   - the individual stage files are flipped to non-publishable, so they stay
 *     reviewable + in their type library but out of Approved/Published,
 *   - publishing the deliverable publishes the task (existing TaskAsset mirror),
 *   - if a stage is sent back for rework, an unpublished deliverable is
 *     withdrawn again.
 *
 * Call after any stage review / submission change.
 */
export async function syncTaskDeliverable(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      stages: { orderBy: { order: "asc" } },
      assets: { include: { asset: true } },
    },
  });
  if (!task || task.deletedAt) return null;

  // Files handed in for a stage (ignore the deliverable itself + deleted files).
  const stageLinks = task.assets.filter(
    (l) => l.stageId && l.asset && !l.asset.deletedAt && l.assetId !== task.deliverableAssetId,
  );
  const ready =
    task.stages.length > 0 &&
    stageLinks.length > 0 &&
    task.stages.every((s) => s.reviewStatus === "APPROVED");

  const existing = task.deliverableAssetId
    ? await prisma.mediaAsset.findUnique({ where: { id: task.deliverableAssetId } })
    : null;

  if (!ready) {
    // Withdraw a deliverable that isn't live yet — the task went back in progress.
    if (existing && !existing.deletedAt && existing.status !== "PUBLISHED") {
      await prisma.mediaAsset.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      await prisma.task.update({ where: { id: taskId }, data: { deliverableAssetId: null } });
    }
    return null;
  }

  // Nothing to do once it's live — never rewrite a published deliverable.
  if (existing && !existing.deletedAt && existing.status === "PUBLISHED") return existing.id;

  // The part that represents the piece publicly (a "gets published" stage, e.g.
  // Graphics/Video) becomes the cover; every other stage file rides along.
  const orderOf = new Map(task.stages.map((s, i) => [s.id, i]));
  const sorted = [...stageLinks].sort(
    (a, b) => (orderOf.get(a.stageId!) ?? 0) - (orderOf.get(b.stageId!) ?? 0),
  );
  const publishableStageIds = new Set(
    task.stages.filter((s) => s.publishable).map((s) => s.id),
  );
  const primaryLink =
    sorted.find((l) => publishableStageIds.has(l.stageId!)) ?? sorted[0];
  const primary = primaryLink.asset!;
  const parts = sorted.filter((l) => l.assetId !== primary.id).map((l) => l.asset!);

  const data = {
    title: task.title,
    type: primary.type,
    url: primary.url,
    thumbnailUrl: primary.thumbnailUrl,
    filename: primary.filename,
    mimeType: primary.mimeType,
    sizeBytes: primary.sizeBytes,
    html: primary.html,
    note: `Final deliverable for “${task.title}” — includes every stage's file.`,
    status: "APPROVED",
    publishable: true,
    reviewedAt: new Date(),
    deletedAt: null,
  };

  let deliverableId: string;
  if (existing) {
    await prisma.mediaAsset.update({ where: { id: existing.id }, data });
    deliverableId = existing.id;
  } else {
    const created = await prisma.mediaAsset.create({
      data: {
        ...data,
        workspaceId: task.workspaceId,
        personId: primary.personId,
        createdById: task.createdById,
        source: "UPLOAD",
        tags: serializeTags([]),
      },
      select: { id: true },
    });
    deliverableId = created.id;
    await prisma.task.update({
      where: { id: taskId },
      data: { deliverableAssetId: deliverableId },
    });
  }

  // Parts = the other stages' files, rebuilt from scratch so it always matches
  // the current approved set.
  await prisma.mediaAssetFile.deleteMany({ where: { assetId: deliverableId } });
  if (parts.length) {
    await prisma.mediaAssetFile.createMany({
      data: parts.map((p, i) => ({
        assetId: deliverableId,
        url: p.url ?? "",
        filename: p.filename,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes,
        thumbnailUrl: p.thumbnailUrl,
        order: i + 1,
      })),
    });
  }

  // Mirror the task's platform + account so library filters work on it.
  await prisma.assetChannel.deleteMany({ where: { assetId: deliverableId } });
  if (task.channelId) {
    await prisma.assetChannel.create({
      data: {
        assetId: deliverableId,
        channelId: task.channelId,
        scheduledFor: task.scheduledPublishDate,
      },
    });
  }
  await prisma.assetAccount.deleteMany({ where: { assetId: deliverableId } });
  if (task.accountId) {
    await prisma.assetAccount.create({
      data: { assetId: deliverableId, accountId: task.accountId },
    });
  }

  // Link to the task (no stage) so publishing it publishes the task.
  await prisma.taskAsset.upsert({
    where: { taskId_assetId: { taskId, assetId: deliverableId } },
    update: { stageId: null },
    create: { taskId, assetId: deliverableId, stageId: null },
  });

  // Individual stage files are never published on their own.
  await prisma.mediaAsset.updateMany({
    where: { id: { in: sorted.map((l) => l.assetId) } },
    data: { publishable: false },
  });

  return deliverableId;
}
