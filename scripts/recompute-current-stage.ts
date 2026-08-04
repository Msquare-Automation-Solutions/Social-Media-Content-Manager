import { prisma } from "@/lib/db";
import { recomputeCurrentStage } from "@/lib/task-server";

// One-off: re-derive every task's board column. Publishing via the content side
// used to skip this, so published tasks could linger in "In queue".
async function main() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, currentStage: true },
  });
  let changed = 0;
  for (const t of tasks) {
    const next = await recomputeCurrentStage(t.id);
    if (next && next !== t.currentStage) {
      console.log(`  ${t.title}: ${t.currentStage} → ${next}`);
      changed++;
    }
  }
  console.log(`Done. ${changed} of ${tasks.length} task(s) corrected.`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
