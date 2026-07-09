import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { hashPassword, passwordSchema } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin resets another user's password (ADMIN and above). Bumps
// passwordChangedAt to invalidate that user's existing sessions. `id` is the
// membershipId. Self-service password change lives in account settings.
const schema = z.object({ password: passwordSchema });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Bad request", { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!membership) return new Response("Not found", { status: 404 });
  if (membership.userId === g.user.id) {
    return new Response("Change your own password in Account settings", { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: membership.userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });
  return Response.json({ ok: true });
}
