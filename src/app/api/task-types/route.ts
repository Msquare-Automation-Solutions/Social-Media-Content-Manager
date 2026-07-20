import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().trim().min(1).max(60) });

// GET — the workspace's content types (any authenticated user).
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;
  const types = await prisma.taskType.findMany({
    where: { workspaceId: g.user.workspaceId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return Response.json(types);
}

// POST — add a content type. ADMIN/OWNER only.
export async function POST(req: Request) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  // Reuse an archived type of the same name if present (restore), else create.
  const existing = await prisma.taskType.findFirst({
    where: { workspaceId: g.user.workspaceId, name: parsed.data.name },
  });
  const type = existing
    ? await prisma.taskType.update({
        where: { id: existing.id },
        data: { deletedAt: null },
        select: { id: true, name: true },
      })
    : await prisma.taskType.create({
        data: { workspaceId: g.user.workspaceId, name: parsed.data.name },
        select: { id: true, name: true },
      });
  return Response.json(type, { status: 201 });
}
