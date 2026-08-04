import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { createNotifications, reviewNotificationRecipients } from "@/lib/notifications";
import { recomputeCurrentStage } from "@/lib/task-server";
import { syncTaskDeliverable } from "@/lib/deliverable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Review workflow transitions:
//   PENDING → APPROVED | REWORK   (admins only)
//   APPROVED → PUBLISHED          (creator of the item, or any admin)
//   PUBLISHED → APPROVED          (admins only — undo a publish)
// A note is required for REWORK.
const schema = z
  .object({
    status: z.enum(["APPROVED", "REWORK", "PUBLISHED"]),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.status !== "REWORK" || !!d.note, {
    message: "Add a comment explaining what to rework",
    path: ["note"],
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Bad request", { status: 400 });
  }

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId, deletedAt: null },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  const admin = isAdminRole(g.user.role);
  const target = parsed.data.status;

  // Permission + valid-transition checks per target status.
  if (target === "APPROVED" || target === "REWORK") {
    if (!admin) return new Response("Only admins can review content", { status: 403 });
  } else if (target === "PUBLISHED") {
    const isCreator = asset.createdById === g.user.id;
    if (!admin && !isCreator) {
      return new Response("Only the creator or an admin can publish", { status: 403 });
    }
    if (asset.status !== "APPROVED") {
      return new Response("Only approved content can be published", { status: 400 });
    }
    if (!asset.publishable) {
      return new Response("This file is marked as not for publishing", { status: 400 });
    }
  }

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      status: target,
      reviewNote: target === "REWORK" ? parsed.data.note! : null,
      reviewedAt: new Date(),
    },
  });

  // Approving/reworking the content mirrors onto the task stage(s) it was
  // submitted for, so you don't have to approve again inside the task.
  if (target === "APPROVED" || target === "REWORK") {
    const links = await prisma.taskAsset.findMany({
      where: { assetId: asset.id, stageId: { not: null } },
      select: { taskId: true, stageId: true },
    });
    if (links.length) {
      await prisma.taskStage.updateMany({
        where: { id: { in: links.map((l) => l.stageId!) } },
        data: {
          reviewStatus: target,
          reviewedAt: new Date(),
          reviewNote: target === "REWORK" ? parsed.data.note! : null,
        },
      });
      for (const taskId of [...new Set(links.map((l) => l.taskId))]) {
        await recomputeCurrentStage(taskId);
        // Approving the last stage's file completes the task's deliverable.
        await syncTaskDeliverable(taskId);
      }
    }
  }

  // Publishing the content publishes its task too, so you don't have to mark it
  // published in both places. Only flips a task that isn't already published.
  if (target === "PUBLISHED") {
    const links = await prisma.taskAsset.findMany({
      where: { assetId: asset.id },
      select: { taskId: true },
    });
    const taskIds = links.map((l) => l.taskId);
    if (taskIds.length) {
      // Tasks about to flip to published — grab schedule + analyst.
      const toPublish = await prisma.task.findMany({
        where: { id: { in: taskIds }, workspaceId: g.user.workspaceId, publishStatus: { notIn: ["PUBLISHED_ON_TIME", "PUBLISHED_DELAY"] } },
        select: { id: true, title: true, analystId: true, scheduledPublishDate: true },
      });
      const now = new Date();
      const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      for (const tk of toPublish) {
        const delayed = tk.scheduledPublishDate ? day(now) > day(tk.scheduledPublishDate) : false;
        await prisma.task.update({
          where: { id: tk.id },
          data: { publishStatus: delayed ? "PUBLISHED_DELAY" : "PUBLISHED_ON_TIME", publishedDate: now },
        });
      }
      for (const tk of toPublish) {
        if (tk.analystId)
          await createNotifications(g.user, [tk.analystId], {
            action: "task.analytics",
            message: `“${tk.title}” is published — add its analytics`,
            targetType: "task", targetId: tk.id, targetLabel: tk.title,
          });
      }
    }
  }

  const action =
    target === "APPROVED"
      ? "asset.approved"
      : target === "REWORK"
        ? "asset.reworked"
        : "asset.published";

  await logActivity(g.user, {
    action,
    targetId: asset.id,
    targetLabel: asset.title,
    ...(target === "REWORK" ? { metadata: { note: parsed.data.note } } : {}),
  });

  // Notify the uploader + other admins (minus the actor) that a decision landed.
  const verb =
    target === "APPROVED" ? "approved" : target === "REWORK" ? "requested rework on" : "published";
  const recipients = await reviewNotificationRecipients(g.user.workspaceId, {
    createdById: asset.createdById,
    personId: asset.personId,
  });
  await createNotifications(g.user, recipients, {
    action,
    message: `${verb} “${asset.title}”`,
    targetType: "asset",
    targetId: asset.id,
    targetLabel: asset.title,
  });

  return Response.json({ ok: true });
}
