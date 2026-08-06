/**
 * One-off: re-derive every task's weekLabel from its publishing date.
 *
 * The label used to come from the planning date, so a piece planned in the first
 * week of August but scheduled for September sat under "August W1". A task
 * belongs to the week it goes out; the planning date is only a fallback.
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
    const src = t.scheduledPublishDate ?? t.plannedDate;
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
