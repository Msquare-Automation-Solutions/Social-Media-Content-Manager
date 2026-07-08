import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { canMutateAsset } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Restore a soft-deleted asset from Trash (undelete).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: params.id, workspaceId: g.user.workspaceId },
  });
  if (!asset || !asset.deletedAt) return new Response("Not found", { status: 404 });
  if (!canMutateAsset(g.user, asset)) return new Response("Forbidden", { status: 403 });

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { deletedAt: null },
  });
  return Response.json({ ok: true });
}
