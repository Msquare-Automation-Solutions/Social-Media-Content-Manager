import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  assetId: z.string().min(1),
  stageId: z.string().nullable().optional(), // which stage this file is for
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

  await prisma.taskAsset.upsert({
    where: { taskId_assetId: { taskId: id, assetId: parsed.data.assetId } },
    update: { stageId: parsed.data.stageId ?? null },
    create: { taskId: id, assetId: parsed.data.assetId, stageId: parsed.data.stageId ?? null },
  });
  return Response.json({ ok: true }, { status: 201 });
}
