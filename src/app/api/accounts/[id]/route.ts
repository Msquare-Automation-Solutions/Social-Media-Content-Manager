import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().max(600).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

async function ownAccount(id: string, workspaceId: string) {
  return prisma.account.findFirst({ where: { id, workspaceId } });
}

// Rename / recolor / change the icon of an account — admins only.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const { id } = await params;
  const account = await ownAccount(id, g.user.workspaceId);
  if (!account || account.deletedAt) return new Response("Not found", { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
    },
    select: { id: true, name: true, icon: true, color: true },
  });
  return Response.json(updated);
}

// Soft-delete (archive) an account — admins only. Existing content keeps its
// tag; the account just leaves pickers and filters.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const { id } = await params;
  const account = await ownAccount(id, g.user.workspaceId);
  if (!account || account.deletedAt) return new Response("Not found", { status: 404 });

  await prisma.account.update({ where: { id }, data: { deletedAt: new Date() } });
  return new Response(null, { status: 204 });
}
