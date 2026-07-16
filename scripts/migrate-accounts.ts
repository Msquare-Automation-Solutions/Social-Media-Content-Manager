import { PrismaClient } from "@prisma/client";

// One-time, non-destructive account setup for existing databases:
//   • seed the workspace's Account taxonomy (Faasil, Jahar, Msquare, AI Lab)
//   • remove the mistaken "AI Lab" SocialChannel (it's an Account, not a
//     platform); its AssetChannel links cascade away
// Idempotent — re-running is a no-op once reconciled. Never wipes content.
//
//   npm run migrate:accounts   (targets whatever DATABASE_URL points at)

const prisma = new PrismaClient();

const ACCOUNTS = [
  { name: "Faasil", icon: "🧑", color: "#0e9f8f" },
  { name: "Jahar", icon: "🧑", color: "#7a4fc9" },
  { name: "Msquare", icon: "◆", color: "#0866ff" },
  { name: "AI Lab", icon: "✨", color: "#e8318f" },
];

async function main() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });
  for (const ws of workspaces) {
    for (const a of ACCOUNTS) {
      const existing = await prisma.account.findFirst({
        where: { workspaceId: ws.id, name: a.name },
      });
      if (existing) {
        // Un-archive if it had been soft-deleted.
        if (existing.deletedAt) {
          await prisma.account.update({ where: { id: existing.id }, data: { deletedAt: null } });
          console.log(`↺ restored account "${a.name}" in ${ws.name}`);
        }
      } else {
        await prisma.account.create({ data: { workspaceId: ws.id, ...a } });
        console.log(`+ account "${a.name}" in ${ws.name}`);
      }
    }

    // Drop the "AI Lab" social platform if it was created by mistake.
    const aiLab = await prisma.socialChannel.findFirst({
      where: { workspaceId: ws.id, name: "AI Lab" },
    });
    if (aiLab) {
      await prisma.assetChannel.deleteMany({ where: { channelId: aiLab.id } });
      await prisma.socialChannel.delete({ where: { id: aiLab.id } });
      console.log(`- removed "AI Lab" platform in ${ws.name}`);
    }
  }
  console.log("done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
