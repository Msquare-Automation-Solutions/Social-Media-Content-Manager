import { PrismaClient } from "@prisma/client";

// One-time platform reconciliation for existing databases:
//   • combine "Instagram" + "Facebook" into a single "Instagram & Facebook"
//   • rename/repoint "TikTok" → "Twitter / X"
//   • ensure "Medium" exists
// Asset↔channel links are repointed (deduped on the composite PK) so no content
// loses its platform. Idempotent — re-running is a no-op once reconciled.
//
//   npm run migrate:platforms   (targets whatever DATABASE_URL points at)

const prisma = new PrismaClient();

const COMBINED = { name: "Instagram & Facebook", icon: "📷", color: "#0866ff" };
const TWITTER = { name: "Twitter / X", icon: "🐦", color: "#000000" };
const MEDIUM = { name: "Medium", icon: "✍️", color: "#000000" };

async function withRetry<T>(fn: () => Promise<T>, n = 6): Promise<T> {
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === n - 1) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("unreachable");
}

// Move every AssetChannel from `fromId` onto `toId` (deduping the composite PK),
// then delete the now-empty source channel.
async function mergeChannel(fromId: string, toId: string) {
  if (fromId === toId) return;
  const links = await prisma.assetChannel.findMany({ where: { channelId: fromId } });
  for (const l of links) {
    await prisma.assetChannel.upsert({
      where: { assetId_channelId: { assetId: l.assetId, channelId: toId } },
      create: { assetId: l.assetId, channelId: toId, scheduledFor: l.scheduledFor },
      update: {},
    });
  }
  await prisma.assetChannel.deleteMany({ where: { channelId: fromId } });
  await prisma.socialChannel.delete({ where: { id: fromId } });
}

async function reconcileWorkspace(workspaceId: string) {
  const channels = await prisma.socialChannel.findMany({ where: { workspaceId } });
  const byName = (name: string) => channels.find((c) => c.name === name);

  // 1. Combined Instagram & Facebook — reuse existing combined, else rename
  //    Instagram into it, else create it.
  let combined = byName(COMBINED.name);
  const instagram = byName("Instagram");
  if (!combined && instagram) {
    combined = await prisma.socialChannel.update({
      where: { id: instagram.id },
      data: COMBINED,
    });
  } else if (!combined) {
    combined = await prisma.socialChannel.create({ data: { workspaceId, ...COMBINED } });
  } else {
    await prisma.socialChannel.update({ where: { id: combined.id }, data: COMBINED });
  }
  for (const name of ["Instagram", "Facebook"]) {
    const ch = byName(name);
    if (ch && ch.id !== combined.id) await mergeChannel(ch.id, combined.id);
  }

  // 2. Twitter / X — reuse existing, else rename TikTok into it, else create;
  //    then absorb any leftover TikTok.
  let twitter = byName(TWITTER.name);
  const tiktok = byName("TikTok");
  if (!twitter && tiktok) {
    twitter = await prisma.socialChannel.update({ where: { id: tiktok.id }, data: TWITTER });
  } else if (!twitter) {
    twitter = await prisma.socialChannel.create({ data: { workspaceId, ...TWITTER } });
  }
  const leftoverTikTok = byName("TikTok");
  if (leftoverTikTok && leftoverTikTok.id !== twitter.id) {
    await mergeChannel(leftoverTikTok.id, twitter.id);
  }

  // 3. Medium — ensure it exists.
  if (!byName(MEDIUM.name)) {
    await prisma.socialChannel.create({ data: { workspaceId, ...MEDIUM } });
  }
}

async function main() {
  const workspaces = await withRetry(() => prisma.workspace.findMany({ select: { id: true } }));
  for (const w of workspaces) {
    await withRetry(() => reconcileWorkspace(w.id));
  }
  console.log(`Reconciled platforms for ${workspaces.length} workspace(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
