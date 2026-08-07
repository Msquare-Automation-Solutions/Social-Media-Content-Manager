import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { hasRole, isContributor } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { purgeBinItem } from "@/lib/bin-purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permanently delete a binned idea — the counterpart to restore, and the only way
 * to get something out of Trash for good before the 30-day sweep does it.
 *
 * Only applies to items already in Trash: you can't skip the soft delete and wipe
 * something straight out of the bin.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  const { id } = await params;
  const item = await prisma.contentBinItem.findFirst({
    where: { id, workspaceId: g.user.workspaceId },
  });
  if (!item || !item.deletedAt) return new Response("Not found", { status: 404 });

  // Same ownership rule as deleting and restoring: admins anything, contributors
  // only what they captured.
  const mine = item.createdById === g.user.id;
  if (!hasRole(g.user.role, "ADMIN") && !(isContributor(g.user.role) && mine)) {
    return new Response("Forbidden", { status: 403 });
  }

  await purgeBinItem(item);
  await logActivity(g.user, {
    action: "bin.purged",
    targetType: "bin",
    targetId: id,
    targetLabel: item.title,
  });
  return new Response(null, { status: 204 });
}
