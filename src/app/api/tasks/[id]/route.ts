import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { recomputeCurrentStage } from "@/lib/task-server";
import { weekLabelForDate } from "@/lib/tasks";
import { TASK_PUBLISH_STATUSES, TASK_STAGES } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  // Overview fields (EDITOR).
  title: z.string().trim().min(1).max(200).optional(),
  brief: z.string().trim().max(2000).optional(),
  content: z.string().trim().max(100000).optional(),
  remarks: z.string().trim().max(2000).optional(),
  contentType: z.string().trim().min(1).max(60).optional(),
  channelId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  weekLabel: z.string().trim().max(40).optional(),
  plannedDate: z.string().datetime().nullable().optional(),
  // Explicit per-task stages — reconciled with existing rows (keeps assignments).
  stages: z.array(z.enum(TASK_STAGES)).min(1).optional(),
  binItemId: z.string().nullable().optional(),
  assetIds: z.array(z.string()).max(50).optional(),
  // Publish.
  publishStatus: z.enum(TASK_PUBLISH_STATUSES).optional(),
  contentLink: z.string().trim().max(2000).nullable().optional(),
  publishedDate: z.string().datetime().nullable().optional(),
  // Analytics.
  metricClicks: z.number().int().nonnegative().nullable().optional(),
  metricLeads: z.number().int().nonnegative().nullable().optional(),
  metricEng: z.number().int().nonnegative().nullable().optional(),
  metricsNote: z.string().trim().max(2000).nullable().optional(),
});

async function own(id: string, workspaceId: string) {
  return prisma.task.findFirst({ where: { id, workspaceId }, include: { stages: true } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;
  const { id } = await params;
  const task = await own(id, g.user.workspaceId);
  if (!task || task.deletedAt) return new Response("Not found", { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;

  const week =
    d.plannedDate !== undefined && d.plannedDate ? weekLabelForDate(d.plannedDate) : undefined;
  const publishing = d.publishStatus !== undefined && d.publishStatus.startsWith("PUBLISHED");
  const recordingMetrics =
    d.metricClicks !== undefined || d.metricLeads !== undefined || d.metricEng !== undefined;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.brief !== undefined ? { brief: d.brief } : {}),
        ...(d.content !== undefined ? { content: d.content } : {}),
        ...(d.remarks !== undefined ? { remarks: d.remarks } : {}),
        ...(d.contentType !== undefined ? { contentType: d.contentType } : {}),
        ...(d.channelId !== undefined ? { channelId: d.channelId } : {}),
        ...(d.accountId !== undefined ? { accountId: d.accountId } : {}),
        ...(week !== undefined ? { weekLabel: week } : d.weekLabel !== undefined ? { weekLabel: d.weekLabel } : {}),
        ...(d.plannedDate !== undefined ? { plannedDate: d.plannedDate ? new Date(d.plannedDate) : null } : {}),
        ...(d.binItemId !== undefined ? { binItemId: d.binItemId } : {}),
        ...(d.publishStatus !== undefined ? { publishStatus: d.publishStatus } : {}),
        ...(d.contentLink !== undefined ? { contentLink: d.contentLink } : {}),
        ...(d.publishedDate !== undefined
          ? { publishedDate: d.publishedDate ? new Date(d.publishedDate) : null }
          : publishing
            ? { publishedDate: new Date() }
            : {}),
        ...(d.metricClicks !== undefined ? { metricClicks: d.metricClicks } : {}),
        ...(d.metricLeads !== undefined ? { metricLeads: d.metricLeads } : {}),
        ...(d.metricEng !== undefined ? { metricEng: d.metricEng } : {}),
        ...(d.metricsNote !== undefined ? { metricsNote: d.metricsNote } : {}),
      },
    });

    // Reconcile stages if the planner changed the selection: add newly-picked
    // stages, drop deselected ones, keep existing rows (and their assignments).
    if (d.stages !== undefined) {
      const want = TASK_STAGES.filter((s) => d.stages!.includes(s));
      const have = new Set(task.stages.map((s) => s.stage));
      const remove = task.stages.filter((s) => !want.includes(s.stage as (typeof want)[number]));
      if (remove.length)
        await tx.taskStage.deleteMany({ where: { id: { in: remove.map((s) => s.id) } } });
      for (let i = 0; i < want.length; i++) {
        const stage = want[i];
        if (have.has(stage)) await tx.taskStage.updateMany({ where: { taskId: id, stage }, data: { order: i } });
        else await tx.taskStage.create({ data: { taskId: id, stage, order: i } });
      }
    }

    if (d.assetIds !== undefined) {
      await tx.taskAsset.deleteMany({ where: { taskId: id } });
      if (d.assetIds.length)
        await tx.taskAsset.createMany({
          data: d.assetIds.map((assetId) => ({ taskId: id, assetId })),
          skipDuplicates: true,
        });
    }
  });

  await recomputeCurrentStage(id);

  // Activity for the notable transitions.
  if (publishing)
    await logActivity(g.user, {
      action: "task.published",
      targetType: "task",
      targetId: id,
      targetLabel: task.title,
    });
  else if (recordingMetrics)
    await logActivity(g.user, {
      action: "task.analytics",
      targetType: "task",
      targetId: id,
      targetLabel: task.title,
    });
  else
    await logActivity(g.user, {
      action: "task.updated",
      targetType: "task",
      targetId: id,
      targetLabel: task.title,
    });

  return Response.json({ id });
}

// Soft-delete → Trash (30-day restore handled by the shared trash flow).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;
  const { id } = await params;
  const task = await own(id, g.user.workspaceId);
  if (!task || task.deletedAt) return new Response("Not found", { status: 404 });

  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity(g.user, {
    action: "task.deleted",
    targetType: "task",
    targetId: id,
    targetLabel: task.title,
  });
  return new Response(null, { status: 204 });
}
