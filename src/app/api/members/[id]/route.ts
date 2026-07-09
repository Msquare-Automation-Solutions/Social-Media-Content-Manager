import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Change a member's role — ADMIN and above. Owners cannot be modified, and no
// one is promoted to OWNER via this route (v1).
const schema = z.object({
  role: z.enum(ROLES).refine((r) => r !== "OWNER", "Cannot assign OWNER"),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!membership) return new Response("Not found", { status: 404 });
  if (membership.role === "OWNER") {
    return new Response("Cannot modify an owner", { status: 403 });
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { role: parsed.data.role },
  });
  return Response.json({ ok: true });
}

// Remove a member — ADMIN and above. Owners cannot be removed.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const membership = await prisma.membership.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!membership) return new Response("Not found", { status: 404 });
  if (membership.role === "OWNER") {
    return new Response("Cannot remove an owner", { status: 403 });
  }

  await prisma.membership.delete({ where: { id: membership.id } });
  return Response.json({ ok: true });
}
