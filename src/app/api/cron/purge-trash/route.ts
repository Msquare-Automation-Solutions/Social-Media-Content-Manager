import { prisma } from "@/lib/db";
import { purgeBinItem } from "@/lib/bin-purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

/**
 * The 30-day clear-out the Trash page has always promised.
 *
 * Nothing was actually doing it, so binned ideas sat in Trash indefinitely. This
 * removes ideas soft-deleted more than 30 days ago, along with their screenshots.
 *
 * Media assets are NOT swept here — deleting real files is a bigger decision than
 * this job should make on its own, and they'd need their versions and thumbnails
 * considering too. They still sit in Trash awaiting a deliberate purge.
 *
 * Protected by CRON_SECRET when set, like the reminders job.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000);
  const stale = await prisma.contentBinItem.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, title: true, screenshots: true, promotedAssetId: true },
  });

  for (const item of stale) await purgeBinItem(item);

  return Response.json({
    ok: true,
    purged: stale.length,
    cutoff: cutoff.toISOString(),
    titles: stale.map((s) => s.title).slice(0, 20),
  });
}
