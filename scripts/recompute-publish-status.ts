import { prisma } from "@/lib/db";

// One-off: recompute PUBLISHED_ON_TIME vs PUBLISHED_DELAY for already-published
// tasks, by comparing the recorded publish day to the scheduled publish date.
const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

async function main() {
  const tasks = await prisma.task.findMany({
    where: { publishStatus: { startsWith: "PUBLISHED" }, deletedAt: null },
    select: { id: true, title: true, publishStatus: true, scheduledPublishDate: true, publishedDate: true },
  });
  let changed = 0;
  for (const t of tasks) {
    if (!t.scheduledPublishDate || !t.publishedDate) continue;
    const delayed = day(t.publishedDate) > day(t.scheduledPublishDate);
    const target = delayed ? "PUBLISHED_DELAY" : "PUBLISHED_ON_TIME";
    if (target !== t.publishStatus) {
      await prisma.task.update({ where: { id: t.id }, data: { publishStatus: target } });
      console.log(`  ${t.title}: ${t.publishStatus} → ${target}`);
      changed++;
    }
  }
  console.log(`Done. ${changed} task(s) updated out of ${tasks.length} published.`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
