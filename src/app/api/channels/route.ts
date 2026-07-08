import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().max(8).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

// Inline "＋ Add platform" — EDITOR and above.
export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const channel = await prisma.socialChannel.create({
    data: {
      workspaceId: g.user.workspaceId,
      name: parsed.data.name,
      icon: parsed.data.icon || "✨",
      color: parsed.data.color || "#0e9f8f",
    },
    select: { id: true, name: true, icon: true, color: true },
  });
  return Response.json(channel, { status: 201 });
}
