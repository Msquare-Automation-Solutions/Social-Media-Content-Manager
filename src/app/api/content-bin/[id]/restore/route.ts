import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { hasRole, isContributor } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Restore a binned idea from Trash. Mirrors the asset restore route.
 *
 * A contributor can only bring back something they captured — the same rule that
 * governs deleting it. Admins can restore anyone's.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  const { id } = await params;
  const item = await prisma.contentBinItem.findFirst({
    where: { id, workspaceId: g.user.workspaceId },
  });
  if (!item || !item.deletedAt) return new Response("Not found", { status: 404 });

  const mine = item.createdById === g.user.id;
  if (!hasRole(g.user.role, "ADMIN") && !(isContributor(g.user.role) && mine)) {
    return new Response("Forbidden", { status: 403 });
  }

  await prisma.contentBinItem.update({ where: { id }, data: { deletedAt: null } });
  await logActivity(g.user, {
    action: "bin.restored",
    targetType: "bin",
    targetId: id,
    targetLabel: item.title,
  });
  return Response.json({ ok: true });
}
