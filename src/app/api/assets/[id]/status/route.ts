import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin review decision (ADMIN+): APPROVE or send back for REWORK with a note.
// Uploaders can't reach this route — they only ever leave content IN_QUEUE.
const schema = z
  .object({
    status: z.enum(["APPROVED", "REWORK"]),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.status !== "REWORK" || !!d.note, {
    message: "Add a comment explaining what to rework",
    path: ["note"],
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Bad request", { status: 400 });
  }

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId, deletedAt: null },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  const approved = parsed.data.status === "APPROVED";
  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      status: parsed.data.status,
      reviewNote: approved ? null : parsed.data.note!,
      reviewedAt: new Date(),
    },
  });

  await logActivity(g.user, {
    action: approved ? "asset.approved" : "asset.reworked",
    targetId: asset.id,
    targetLabel: asset.title,
    ...(approved ? {} : { metadata: { note: parsed.data.note } }),
  });

  return Response.json({ ok: true });
}
