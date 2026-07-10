import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mark notifications read — a single one by id, or all of the caller's unread.
const schema = z.object({ id: z.string().min(1).optional() });

export async function PATCH(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  await prisma.notification.updateMany({
    where: {
      recipientId: g.user.id,
      readAt: null,
      ...(parsed.data.id ? { id: parsed.data.id } : {}),
    },
    data: { readAt: new Date() },
  });
  return Response.json({ ok: true });
}
