import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  assetId: z.string().min(1),
  stageId: z.string().nullable().optional(), // which stage this file is for
  // Re-submit: supersede the stage's previous file(s) with this one.
  replace: z.boolean().optional(),
});

// Link a media asset to a task (optionally to a specific stage's submission).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;
  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, workspaceId: g.user.workspaceId, deletedAt: null },
    select: { id: true },
  });
  if (!task) return new Response("Not found", { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const { assetId, stageId = null, replace } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Replacing a stage's submission: unlink the prior file(s) for this stage
    // and soft-delete them (recoverable in Trash), so the new file takes over.
    if (replace && stageId) {
      const prior = await tx.taskAsset.findMany({
        where: { taskId: id, stageId, assetId: { not: assetId } },
        select: { assetId: true },
      });
      const priorIds = prior.map((p) => p.assetId);
      if (priorIds.length) {
        await tx.taskAsset.deleteMany({ where: { taskId: id, assetId: { in: priorIds } } });
        await tx.mediaAsset.updateMany({
          where: { id: { in: priorIds }, workspaceId: g.user.workspaceId },
          data: { deletedAt: new Date() },
        });
      }
    }

    await tx.taskAsset.upsert({
      where: { taskId_assetId: { taskId: id, assetId } },
      update: { stageId },
      create: { taskId: id, assetId, stageId },
    });
  });
  return Response.json({ ok: true }, { status: 201 });
}
