import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { listTasks } from "@/lib/data";
import { weekLabelForDate } from "@/lib/tasks";
import { TASK_STAGES } from "@/lib/enums";
import { logActivity } from "@/lib/activity";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  brief: z.string().trim().max(2000).optional(),
  content: z.string().trim().max(100000).optional(),
  remarks: z.string().trim().max(2000).optional(),
  // Free-form content type (the workspace's editable list; validated only as
  // non-empty so admins can add their own).
  contentType: z.string().trim().min(1).max(60),
  // Stages are chosen per task, each optionally assigned an owner + due date
  // right in the plan form.
  stages: z
    .array(
      z.object({
        stage: z.enum(TASK_STAGES),
        assigneeId: z.string().nullable().optional(),
        targetDate: z.string().datetime().nullable().optional(),
      }),
    )
    .min(1, "Pick at least one stage"),
  channelId: z.string().nullable().optional(),
  accountId: z.string().nullable().optional(),
  plannedDate: z.string().datetime().nullable().optional(),
  weekLabel: z.string().trim().max(40).optional(),
  binItemId: z.string().nullable().optional(),
});

// GET — tasks for the caller's workspace (any authenticated user).
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  return Response.json(await listTasks(g.user.workspaceId));
}

// POST — plan a new content piece. EDITOR+. Instantiates the production stages
// for the content type; owners get assigned afterwards.
export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;
  // Keep the chosen stages in canonical order, carrying their inline assignment.
  const stages = TASK_STAGES.map((s) => d.stages.find((x) => x.stage === s)).filter(
    (s): s is (typeof d.stages)[number] => Boolean(s),
  );
  const week = d.plannedDate ? weekLabelForDate(d.plannedDate) : d.weekLabel ?? "";

  const task = await prisma.task.create({
    data: {
      workspaceId: g.user.workspaceId,
      createdById: g.user.id,
      title: d.title,
      brief: d.brief ?? "",
      content: d.content ?? "",
      remarks: d.remarks ?? "",
      contentType: d.contentType,
      channelId: d.channelId ?? null,
      accountId: d.accountId ?? null,
      weekLabel: week,
      plannedDate: d.plannedDate ? new Date(d.plannedDate) : null,
      binItemId: d.binItemId ?? null,
      currentStage: stages[0]?.stage ?? "PUBLISHING",
      stages: {
        create: stages.map((s, i) => ({
          stage: s.stage,
          order: i,
          assigneeId: s.assigneeId ?? null,
          targetDate: s.targetDate ? new Date(s.targetDate) : null,
        })),
      },
    },
    select: { id: true, title: true },
  });

  await logActivity(g.user, {
    action: "task.created",
    targetType: "task",
    targetId: task.id,
    targetLabel: task.title,
  });
  // Notify anyone assigned a stage at plan time.
  const assignees = [...new Set(stages.map((s) => s.assigneeId).filter((a): a is string => Boolean(a)))];
  if (assignees.length)
    await createNotifications(g.user, assignees, {
      action: "task.assigned",
      message: `assigned you a stage of “${task.title}”`,
      targetType: "task",
      targetId: task.id,
      targetLabel: task.title,
    });
  return Response.json({ id: task.id }, { status: 201 });
}
