import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { snapshotAsset, applySnapshot, canMutateAsset } from "@/lib/assets";
import { parseJson } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Restore an asset to a prior version. Snapshots the CURRENT state first, so
// restore is itself reversible.
export async function POST(
  _req: Request,
  { params }: { params: { id: string; versionId: string } },
) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: params.id, workspaceId: g.user.workspaceId },
  });
  if (!asset) return new Response("Not found", { status: 404 });
  if (!canMutateAsset(g.user, asset)) return new Response("Forbidden", { status: 403 });

  const version = await prisma.assetVersion.findFirst({
    where: { id: params.versionId, assetId: params.id },
  });
  if (!version) return new Response("Version not found", { status: 404 });

  await snapshotAsset(asset.id, g.user.id);
  const snapshot = parseJson<Record<string, unknown>>(version.snapshotJson, {});
  await applySnapshot(asset.id, snapshot);

  return Response.json({ ok: true });
}
