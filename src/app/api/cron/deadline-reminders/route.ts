import { prisma } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
import { STAGE_LABELS } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily reminder job (Vercel Cron, see vercel.json). Notifies each stage's
// assignee when their work is due today or tomorrow and still isn't submitted.
// Protected by CRON_SECRET when set (Vercel sends it as a Bearer token).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startToday.getDate() + 1);
  const endTomorrow = new Date(startToday);
  endTomorrow.setDate(startToday.getDate() + 2);

  // Stages due today or tomorrow that the assignee still owes (not submitted /
  // sent back for rework), on a live task.
  const stages = await prisma.taskStage.findMany({
    where: {
      targetDate: { gte: startToday, lt: endTomorrow },
      assigneeId: { not: null },
      reviewStatus: { in: ["NOT_SUBMITTED", "REWORK"] },
      task: { deletedAt: null },
    },
    include: { task: { select: { id: true, title: true, workspaceId: true } } },
  });

  let sent = 0;
  for (const s of stages) {
    if (!s.assigneeId || !s.targetDate) continue;
    const today = s.targetDate < startTomorrow;
    const when = today ? "today" : "tomorrow";
    const label = STAGE_LABELS[s.stage] ?? s.stage;
    await createNotifications(
      { id: "system", name: "Deadlines", avatarColor: "#e0912b", workspaceId: s.task.workspaceId },
      [s.assigneeId],
      {
        action: "task.reminder",
        message: `‼️ Deadline ${when} — your ${label} work on “${s.task.title}”`,
        targetType: "task",
        targetId: s.task.id,
        targetLabel: s.task.title,
      },
    );
    sent++;
  }

  return Response.json({ ok: true, scanned: stages.length, sent });
}
