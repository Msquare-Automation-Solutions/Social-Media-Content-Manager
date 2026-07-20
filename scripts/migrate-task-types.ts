// One-time, non-destructive, idempotent. Seeds the default content types into
// every workspace and converts any existing Task.contentType stored as an old
// KEY (e.g. "REEL") to its readable name (e.g. "Reels"), so tasks line up with
// the new admin-editable TaskType list. Re-running is a no-op.
//   npx tsx scripts/migrate-task-types.ts
import { prisma } from "@/lib/db";
import { TASK_CONTENT_TYPES, DEFAULT_TASK_TYPE_NAMES, contentTypeLabel } from "@/lib/tasks";

async function main() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  for (const ws of workspaces) {
    // Seed default types (skip names already present, live or archived).
    const existing = await prisma.taskType.findMany({
      where: { workspaceId: ws.id },
      select: { name: true },
    });
    const have = new Set(existing.map((t) => t.name));
    const toAdd = DEFAULT_TASK_TYPE_NAMES.filter((n) => !have.has(n));
    if (toAdd.length)
      await prisma.taskType.createMany({
        data: toAdd.map((name) => ({ workspaceId: ws.id, name })),
      });
    console.log(`ws ${ws.id}: seeded ${toAdd.length} types`);
  }

  // Convert legacy key-based Task.contentType → readable name.
  const keys = new Set(TASK_CONTENT_TYPES.map((t) => t.key));
  const tasks = await prisma.task.findMany({ select: { id: true, contentType: true } });
  let converted = 0;
  for (const t of tasks) {
    if (keys.has(t.contentType)) {
      await prisma.task.update({ where: { id: t.id }, data: { contentType: contentTypeLabel(t.contentType) } });
      converted++;
    }
  }
  console.log(`converted ${converted} task content types to names`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
