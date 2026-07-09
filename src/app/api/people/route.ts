import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { colorFor } from "@/lib/colors";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().optional().or(z.literal("")),
  label: z.string().trim().max(80).optional(),
});

// Inline "＋ Add person" — EDITOR and above. New record is immediately usable
// everywhere (dropdowns + filters).
export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const person = await prisma.person.create({
    data: {
      workspaceId: g.user.workspaceId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      label: parsed.data.label || null,
      avatarColor: colorFor(parsed.data.name),
    },
    select: { id: true, name: true, label: true, avatarColor: true },
  });
  await logActivity(g.user, {
    action: "creator.created",
    targetId: person.id,
    targetLabel: person.name,
  });
  return Response.json(person, { status: 201 });
}
