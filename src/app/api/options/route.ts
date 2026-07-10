import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { ensureSelfPerson } from "@/lib/people";
import { isAdminRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// People + channels for the Save-dialog dropdowns and library filters.
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;

  // The current user's own creator record (created on first need) so the Save
  // dialog can default the creator to whoever is uploading. VIEWERs never save,
  // so we don't provision one for them.
  const mePersonId =
    g.user.role !== "VIEWER" ? await ensureSelfPerson(g.user) : null;

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

  return Response.json({
    people,
    channels,
    canEdit: g.user.role !== "VIEWER",
    mePersonId,
    // Admins may attribute content to any creator; everyone else is locked to
    // themselves (reassignable later via Edit).
    isAdmin: isAdminRole(g.user.role),
  });
}
