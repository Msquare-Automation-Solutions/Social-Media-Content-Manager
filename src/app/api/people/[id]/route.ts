import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().max(80).nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

// Edit a creator (EDITOR+). Workspace-scoped.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;
  const { id } = await params;

  const person = await prisma.person.findFirst({
    where: { id, workspaceId: g.user.workspaceId },
    select: { id: true },
  });
  if (!person) return new Response("Not found", { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const updated = await prisma.person.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.label !== undefined
        ? { label: parsed.data.label || null }
        : {}),
      ...(parsed.data.email !== undefined
        ? { email: parsed.data.email || null }
        : {}),
      ...(parsed.data.avatarColor !== undefined
        ? { avatarColor: parsed.data.avatarColor }
        : {}),
    },
    select: { id: true, name: true, label: true, avatarColor: true },
  });
  await logActivity(g.user, {
    action: "creator.updated",
    targetId: updated.id,
    targetLabel: updated.name,
  });
  return Response.json(updated);
}

// Delete a creator (EDITOR+) — only when nothing is attributed to them, since
// MediaAsset.personId is required. Returns 409 if assets still reference them.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;
  const { id } = await params;

  const person = await prisma.person.findFirst({
    where: { id, workspaceId: g.user.workspaceId },
    select: { id: true, name: true },
  });
  if (!person) return new Response("Not found", { status: 404 });

  const assetCount = await prisma.mediaAsset.count({
    where: { personId: id, deletedAt: null },
  });
  if (assetCount > 0) {
    return Response.json(
      {
        error: `Can't remove — ${assetCount} asset${assetCount === 1 ? "" : "s"} still attributed to this creator. Reassign or delete those first.`,
      },
      { status: 409 },
    );
  }

  await prisma.person.delete({ where: { id } });
  await logActivity(g.user, {
    action: "creator.deleted",
    targetId: id,
    targetLabel: person.name,
  });
  return Response.json({ ok: true });
}
