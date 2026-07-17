import { prisma } from "@/lib/db";
import { computeCurrentStage } from "@/lib/tasks";

/** Recompute a task's currentStage from its stages + publish/metrics state and
 * persist it if it changed. Called after any stage/publish/metrics mutation. */
export async function recomputeCurrentStage(taskId: string): Promise<string | null> {
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    include: { stages: true },
  });
  if (!t) return null;
  const hasMetrics =
    t.metricClicks != null || t.metricLeads != null || t.metricEng != null;
  const cur = computeCurrentStage(
    t.stages.map((s) => ({ stage: s.stage, reviewStatus: s.reviewStatus })),
    t.publishStatus,
    hasMetrics,
  );
  if (cur !== t.currentStage) {
    await prisma.task.update({ where: { id: taskId }, data: { currentStage: cur } });
  }
  return cur;
}
