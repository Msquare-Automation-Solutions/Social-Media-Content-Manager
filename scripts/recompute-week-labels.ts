/**
 * One-off: re-derive every task's weekLabel from its planning date — the week
 * the team took the piece on, whatever date it's scheduled to publish.
 *
 *   npx tsx scripts/recompute-week-labels.ts
 */
import { prisma } from "../src/lib/db";
import { weekLabelForDate } from "../src/lib/tasks";

async function main() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, weekLabel: true, scheduledPublishDate: true, plannedDate: true },
  });

  let changed = 0;
  for (const t of tasks) {
    const src = t.plannedDate ?? t.scheduledPublishDate;
    const week = src ? weekLabelForDate(src.toISOString()) : "";
    if (week === t.weekLabel) continue;
    await prisma.task.update({ where: { id: t.id }, data: { weekLabel: week } });
    changed++;
    console.log(`${t.weekLabel || "—"} → ${week || "—"}   ${t.title}`);
  }

  console.log(`\n${changed} of ${tasks.length} tasks re-labelled.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => prisma.$disconnect());
