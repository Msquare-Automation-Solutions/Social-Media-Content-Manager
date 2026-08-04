import { prisma } from "@/lib/db";
import { syncTaskDeliverable } from "@/lib/deliverable";

// One-off backfill for the "one consolidated deliverable per task" model:
//   1. Every file submitted for a task stage becomes a PART — never publishable
//      on its own — so the Approved/Published panels stop listing them.
//   2. Build the consolidated deliverable for every live task, so already-approved
//      tasks get theirs now instead of waiting for the next stage review.
// Standalone library uploads (no task link) are left alone — a directly uploaded
// finished file should still be publishable by itself.
async function main() {
  // 1. Flip all stage submissions to non-publishable.
  const stageLinks = await prisma.taskAsset.findMany({
    where: { stageId: { not: null } },
    select: { assetId: true },
  });
  const stageAssetIds = [...new Set(stageLinks.map((l) => l.assetId))];
  const flipped = stageAssetIds.length
    ? await prisma.mediaAsset.updateMany({
        where: { id: { in: stageAssetIds }, publishable: true },
        data: { publishable: false },
      })
    : { count: 0 };
  console.log(`Stage files marked as parts (not publishable): ${flipped.count} of ${stageAssetIds.length}`);

  // 2. Build/refresh each live task's consolidated deliverable.
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true },
  });
  let built = 0;
  for (const t of tasks) {
    const id = await syncTaskDeliverable(t.id);
    if (id) {
      console.log(`  ✓ ${t.title}`);
      built++;
    }
  }
  console.log(`Deliverables ready: ${built} of ${tasks.length} task(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
