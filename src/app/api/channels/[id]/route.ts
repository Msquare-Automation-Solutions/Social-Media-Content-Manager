import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().max(2000).optional(), // emoji or image URL
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function own(id: string, workspaceId: string) {
  return prisma.socialChannel.findFirst({ where: { id, workspaceId } });
}

// Edit a platform's name / icon / color. Admin only.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;
  const { id } = await params;
  const channel = await own(id, g.user.workspaceId);
  if (!channel) return new Response("Not found", { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const d = parsed.data;

  const updated = await prisma.socialChannel.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.icon !== undefined ? { icon: d.icon } : {}),
      ...(d.color !== undefined ? { color: d.color } : {}),
    },
    select: { id: true, name: true, icon: true, color: true },
  });
  await logActivity(g.user, { action: "platform.updated", targetId: id, targetLabel: updated.name });
  return Response.json(updated);
}

// Remove a platform. Admin only. (Assets tagged with it lose that tag.)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;
  const { id } = await params;
  const channel = await own(id, g.user.workspaceId);
  if (!channel) return new Response("Not found", { status: 404 });
  await prisma.socialChannel.delete({ where: { id } });
  await logActivity(g.user, { action: "platform.deleted", targetId: id, targetLabel: channel.name });
  return Response.json({ ok: true });
}
