import { prisma } from "@/lib/db";
import { storage, keyFromUrl, isOwnedStorageUrl } from "@/lib/storage";
import { parseTags } from "@/lib/json";

type Purgeable = { id: string; screenshots: string; promotedAssetId: string | null };

/**
 * Permanently remove a binned idea and its screenshots.
 *
 * Screenshots are only deleted when the idea was never promoted into an asset —
 * a promoted asset can be pointing at the very same files, and removing them would
 * blank out a piece of published content to save a few kilobytes.
 */
export async function purgeBinItem(item: Purgeable): Promise<void> {
  await prisma.contentBinItem.delete({ where: { id: item.id } });

  if (item.promotedAssetId) return;
  for (const url of parseTags(item.screenshots)) {
    // The URL came from a request body. If it isn't one of ours, deleting the key
    // it maps to would remove somebody else's file — or, with the right string,
    // an arbitrary object in the bucket.
    if (!isOwnedStorageUrl(url)) continue;
    try {
      await storage.delete(keyFromUrl(url));
    } catch {
      // Best-effort file cleanup, same as the asset purge.
    }
  }
}
