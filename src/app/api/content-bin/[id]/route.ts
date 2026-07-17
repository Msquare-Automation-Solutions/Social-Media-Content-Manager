import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { serializeTags } from "@/lib/json";
import { ASSET_TYPES, BIN_STATUSES } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const urls = z.array(z.string().trim().max(2000)).max(30).optional();
const ids = z.array(z.string()).max(50).optional();

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().max(100000).optional(),
  links: urls,
  tags: z.array(z.string().trim().max(40)).max(30).optional(),
  status: z.enum(BIN_STATUSES).optional(),
  personId: z.string().nullable().optional(),
  category: z.enum(ASSET_TYPES).nullable().optional(),
  channelIds: ids,
  accountIds: ids,
  screenshots: urls,
  // Set alongside status="USED" when the item is promoted into a MediaAsset.
  promotedAssetId: z.string().nullable().optional(),
});

async function ownItem(id: string, workspaceId: string) {
  return prisma.contentBinItem.findFirst({ where: { id, workspaceId } });
}

// Edit an idea, change its status (New/Used/Discarded), or link the asset it was
// promoted into. EDITOR and above.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const { id } = await params;
  const item = await ownItem(id, g.user.workspaceId);
  if (!item || item.deletedAt) return new Response("Not found", { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;

  const updated = await prisma.contentBinItem.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.note !== undefined ? { note: d.note } : {}),
      ...(d.links !== undefined ? { links: serializeTags(d.links) } : {}),
      ...(d.tags !== undefined ? { tags: serializeTags(d.tags) } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.personId !== undefined ? { personId: d.personId } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.channelIds !== undefined ? { channelIds: serializeTags(d.channelIds) } : {}),
      ...(d.accountIds !== undefined ? { accountIds: serializeTags(d.accountIds) } : {}),
      ...(d.screenshots !== undefined ? { screenshots: serializeTags(d.screenshots) } : {}),
      ...(d.promotedAssetId !== undefined ? { promotedAssetId: d.promotedAssetId } : {}),
    },
    select: { id: true },
  });
  return Response.json(updated);
}

// Hard-delete (soft) — removes the item from the bin into the normal 30-day
// Trash flow. Discarding (status) is separate and keeps the item in the bin.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const { id } = await params;
  const item = await ownItem(id, g.user.workspaceId);
  if (!item || item.deletedAt) return new Response("Not found", { status: 404 });

  await prisma.contentBinItem.update({ where: { id }, data: { deletedAt: new Date() } });
  return new Response(null, { status: 204 });
}
