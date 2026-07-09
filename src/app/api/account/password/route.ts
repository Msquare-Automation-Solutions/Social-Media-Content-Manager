import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/password";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Change password while logged in. Invalidates other sessions.
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error?.issues[0]?.message ?? "Bad request" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: g.user.id } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return Response.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  await logActivity(g.user, { action: "account.password_changed" });
  return Response.json({ ok: true });
}
