import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { hasRole, isContributor } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { isOwnedStorageUrl } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
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
  // Screenshots must be files this app stored. They're later used to derive
  // storage keys for deletion, so an arbitrary URL here becomes an arbitrary
  // delete later.
  screenshots: z
    .array(z.string().trim().max(2000).refine(isOwnedStorageUrl, "Unrecognised file URL"))
    .max(30)
    .optional(),
  // Set alongside status="USED" when the item is promoted into a MediaAsset.
  promotedAssetId: z.string().nullable().optional(),
});

async function ownItem(id: string, workspaceId: string) {
  return prisma.contentBinItem.findFirst({ where: { id, workspaceId } });
}

// Edit an idea, change its status (New/Used/Discarded), or link the asset it was
// promoted into. EDITOR and above, plus contributors on their own ideas.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  const { id } = await params;
  const item = await ownItem(id, g.user.workspaceId);
  if (!item || item.deletedAt) return new Response("Not found", { status: 404 });

  // A contributor may only touch what they captured. 404 rather than 403 so the
  // response says nothing about other people's ideas.
  const contributor = isContributor(g.user.role);
  if (contributor && item.createdById !== g.user.id) {
    return new Response("Not found", { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;

  // "Used" is a marketing-team judgement about whether an idea became content —
  // not something the person who captured it decides.
  if (contributor && d.status === "USED") {
    return new Response("Forbidden", { status: 403 });
  }

  const updated = await prisma.contentBinItem.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.note !== undefined ? { note: d.note } : {}),
      ...(d.links !== undefined ? { links: serializeTags(d.links) } : {}),
      ...(d.tags !== undefined ? { tags: serializeTags(d.tags) } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      // Contributors can never reassign the creator, not even on their own item.
      ...(d.personId !== undefined && !contributor ? { personId: d.personId } : {}),
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
  // Admins can bin anything; contributors only what they captured themselves.
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  const { id } = await params;
  const item = await ownItem(id, g.user.workspaceId);
  if (!item || item.deletedAt) return new Response("Not found", { status: 404 });

  const mine = item.createdById === g.user.id;
  if (!hasRole(g.user.role, "ADMIN") && !(isContributor(g.user.role) && mine)) {
    return new Response("Forbidden", { status: 403 });
  }

  await prisma.contentBinItem.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity(g.user, {
    action: "bin.deleted",
    targetType: "bin",
    targetId: id,
    targetLabel: item.title,
  });
  return new Response(null, { status: 204 });
}
