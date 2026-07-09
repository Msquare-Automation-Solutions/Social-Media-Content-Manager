import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { snapshotAsset, canMutateAsset } from "@/lib/assets";
import { serializeTags, parseTags } from "@/lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bulk library operations (EDITOR+). Each affected asset is permission-checked
// individually (EDITOR → own, ADMIN+ → all) and, for edits, snapshotted before
// mutating. Returns how many were applied vs skipped (no permission).
const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["delete", "setPerson", "addTags", "setTags"]),
  personId: z.string().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).max(30).optional(),
});

export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { ids, action, personId, tags } = parsed.data;

  // Validate the target person up front for setPerson.
  if (action === "setPerson") {
    if (!personId) return new Response("personId required", { status: 400 });
    const person = await prisma.person.findFirst({
      where: { id: personId, workspaceId: g.user.workspaceId },
      select: { id: true },
    });
    if (!person) return new Response("Person not in workspace", { status: 400 });
  }
  if ((action === "addTags" || action === "setTags") && !tags) {
    return new Response("tags required", { status: 400 });
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: ids }, workspaceId: g.user.workspaceId, deletedAt: null },
  });

  let applied = 0;
  let skipped = 0;

  for (const asset of assets) {
    if (!canMutateAsset(g.user, asset)) {
      skipped++;
      continue;
    }

    if (action === "delete") {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { deletedAt: new Date() },
      });
      applied++;
      continue;
    }

    // Edits: snapshot the current state first (spec: non-negotiable).
    await snapshotAsset(asset.id, g.user.id);

    if (action === "setPerson") {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { personId },
      });
    } else if (action === "setTags") {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { tags: serializeTags(tags!) },
      });
    } else if (action === "addTags") {
      const merged = Array.from(new Set([...parseTags(asset.tags), ...tags!]));
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { tags: serializeTags(merged) },
      });
    }
    applied++;
  }

  return Response.json({ applied, skipped });
}
