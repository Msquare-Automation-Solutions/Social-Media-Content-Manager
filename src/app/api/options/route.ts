import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// People + channels for the Save-dialog dropdowns and library filters.
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;

  const [people, channels] = await Promise.all([
    prisma.person.findMany({
      where: { workspaceId: g.user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, label: true, avatarColor: true },
    }),
    prisma.socialChannel.findMany({
      where: { workspaceId: g.user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);

  return Response.json({ people, channels, canEdit: g.user.role !== "VIEWER" });
}
