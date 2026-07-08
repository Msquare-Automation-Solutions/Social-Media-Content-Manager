import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Version history for an asset.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = await guard();
  if (!g.ok) return g.response;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: params.id, workspaceId: g.user.workspaceId },
    select: { id: true },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  const versions = await prisma.assetVersion.findMany({
    where: { assetId: params.id },
    orderBy: { createdAt: "desc" },
    include: { editedBy: { select: { name: true } } },
  });

  return Response.json(
    versions.map((v) => ({
      id: v.id,
      createdAt: v.createdAt.toISOString(),
      editedBy: v.editedBy.name,
    })),
  );
}
