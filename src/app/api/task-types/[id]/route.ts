import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({ name: z.string().trim().min(1).max(60) });

async function own(id: string, workspaceId: string) {
  return prisma.taskType.findFirst({ where: { id, workspaceId } });
}

// Rename a content type — ADMIN/OWNER.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;
  const { id } = await params;
  const t = await own(id, g.user.workspaceId);
  if (!t || t.deletedAt) return new Response("Not found", { status: 404 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const updated = await prisma.taskType.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });
  return Response.json(updated);
}

// Archive a content type — ADMIN/OWNER. Existing tasks keep their type name.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;
  const { id } = await params;
  const t = await own(id, g.user.workspaceId);
  if (!t || t.deletedAt) return new Response("Not found", { status: 404 });
  await prisma.taskType.update({ where: { id }, data: { deletedAt: new Date() } });
  return new Response(null, { status: 204 });
}
