import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { isOwnedStorageUrl } from "@/lib/storage";
import { serializeTags } from "@/lib/json";
import { listContentBin } from "@/lib/data";
import { createNotifications } from "@/lib/notifications";
import { ASSET_TYPES, BIN_STATUSES } from "@/lib/enums";
import { isContributor } from "@/lib/roles";
import { ensureSelfPerson } from "@/lib/people";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const urls = z.array(z.string().trim().max(2000)).max(30).optional();
const ids = z.array(z.string()).max(50).optional();

const schema = z.object({
  title: z.string().trim().min(1).max(200),
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
});

// GET — all live bin items for the caller's workspace (any authenticated user).
export async function GET() {
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;
  return Response.json(await listContentBin(g.user.workspaceId));
}

// POST — capture a new idea. EDITOR and above (matches the "save/upload" tier).
export async function POST(req: Request) {
  // Contributors exist to add ideas — this is their one write.
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;

  // Contributors capture under their own name — the creator field is not theirs
  // to choose, so whatever arrived from the browser is discarded.
  const personId = isContributor(g.user.role)
    ? await ensureSelfPerson(g.user)
    : d.personId ?? null;

  const item = await prisma.contentBinItem.create({
    data: {
      workspaceId: g.user.workspaceId,
      createdById: g.user.id,
      title: d.title,
      note: d.note ?? "",
      links: serializeTags(d.links ?? []),
      tags: serializeTags(d.tags ?? []),
      status: d.status ?? "NEW",
      personId,
      category: d.category ?? null,
      channelIds: serializeTags(d.channelIds ?? []),
      accountIds: serializeTags(d.accountIds ?? []),
      screenshots: serializeTags(d.screenshots ?? []),
    },
    select: { id: true },
  });

  // Let the whole team know a new idea landed in the Content Bin.
  const members = await prisma.membership.findMany({
    where: { workspaceId: g.user.workspaceId },
    select: { userId: true },
  });
  await createNotifications(
    { id: g.user.id, name: g.user.name, avatarColor: g.user.avatarColor, workspaceId: g.user.workspaceId },
    members.map((m) => m.userId),
    {
      action: "bin.added",
      message: `added “${d.title}” to the Content Bin`,
      targetType: "bin",
      targetId: item.id,
      targetLabel: d.title,
    },
  );

  return Response.json(item, { status: 201 });
}
