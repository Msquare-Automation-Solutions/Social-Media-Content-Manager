import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { createNotifications, adminRecipients } from "@/lib/notifications";
import { recomputeCurrentStage } from "@/lib/task-server";
import { STAGE_LABELS, TASK_WORK_STATUSES } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    assigneeId: z.string().nullable(),
    targetDate: z.string().datetime().nullable().optional(),
  }),
  z.object({
    action: z.literal("work"),
    workStatus: z.enum(TASK_WORK_STATUSES).optional(),
    completedDate: z.string().datetime().nullable().optional(),
    remarks: z.string().trim().max(2000).optional(),
  }),
  z.object({ action: z.literal("submit") }),
  z.object({
    action: z.literal("review"),
    outcome: z.enum(["APPROVED", "REWORK"]),
    note: z.string().trim().max(2000).optional(),
  }),
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> },
) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;
  const { id, stageId } = await params;

  const task = await prisma.task.findFirst({
    where: { id, workspaceId: g.user.workspaceId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!task) return new Response("Not found", { status: 404 });
  const stage = await prisma.taskStage.findFirst({ where: { id: stageId, taskId: id } });
  if (!stage) return new Response("Not found", { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;

  const admin = isAdminRole(g.user.role);
  const isAssignee = stage.assigneeId === g.user.id;
  const label = STAGE_LABELS[stage.stage] ?? stage.stage;
  const actor = { id: g.user.id, name: g.user.name, avatarColor: g.user.avatarColor, workspaceId: g.user.workspaceId };

  if (d.action === "assign") {
    if (!admin) return new Response("Requires ADMIN", { status: 403 });
    await prisma.taskStage.update({
      where: { id: stageId },
      data: {
        assigneeId: d.assigneeId,
        targetDate: d.targetDate ? new Date(d.targetDate) : d.targetDate === null ? null : stage.targetDate,
      },
    });
    if (d.assigneeId)
      await createNotifications(actor, [d.assigneeId], {
        action: "task.assigned",
        message: `assigned you the ${label} stage of “${task.title}”`,
        targetType: "task",
        targetId: id,
        targetLabel: task.title,
      });
    await logActivity(g.user, { action: "task.assigned", targetType: "task", targetId: id, targetLabel: task.title });
    return Response.json({ ok: true });
  }

  if (d.action === "work") {
    if (!admin && !isAssignee) return new Response("Not your stage", { status: 403 });
    await prisma.taskStage.update({
      where: { id: stageId },
      data: {
        ...(d.workStatus !== undefined ? { workStatus: d.workStatus } : {}),
        ...(d.completedDate !== undefined
          ? { completedDate: d.completedDate ? new Date(d.completedDate) : null }
          : {}),
        ...(d.remarks !== undefined ? { remarks: d.remarks } : {}),
      },
    });
    return Response.json({ ok: true });
  }

  if (d.action === "submit") {
    if (!admin && !isAssignee) return new Response("Not your stage", { status: 403 });
    await prisma.taskStage.update({
      where: { id: stageId },
      data: {
        reviewStatus: "PENDING",
        submittedAt: new Date(),
        ...(stage.workStatus.startsWith("COMPLETED") ? {} : { workStatus: "COMPLETED_ON_TIME" }),
        ...(stage.completedDate ? {} : { completedDate: new Date() }),
      },
    });
    const admins = await adminRecipients(g.user.workspaceId);
    await createNotifications(actor, admins, {
      action: "task.submitted",
      message: `submitted the ${label} stage of “${task.title}” for review`,
      targetType: "task",
      targetId: id,
      targetLabel: task.title,
    });
    await logActivity(g.user, { action: "task.submitted", targetType: "task", targetId: id, targetLabel: task.title });
    return Response.json({ ok: true });
  }

  // review (admins only)
  if (!admin) return new Response("Requires ADMIN", { status: 403 });
  const approved = d.outcome === "APPROVED";
  await prisma.taskStage.update({
    where: { id: stageId },
    data: { reviewStatus: approved ? "APPROVED" : "REWORK", reviewedAt: new Date(), reviewNote: d.note ?? null },
  });
  await recomputeCurrentStage(id);
  if (stage.assigneeId)
    await createNotifications(actor, [stage.assigneeId], {
      action: approved ? "task.approved" : "task.reworked",
      message: approved
        ? `approved your ${label} work on “${task.title}”`
        : `sent your ${label} work on “${task.title}” back for rework`,
      targetType: "task",
      targetId: id,
      targetLabel: task.title,
    });
  await logActivity(g.user, {
    action: approved ? "task.approved" : "task.reworked",
    targetType: "task",
    targetId: id,
    targetLabel: task.title,
  });
  return Response.json({ ok: true });
}
