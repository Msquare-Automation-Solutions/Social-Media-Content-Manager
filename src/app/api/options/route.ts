import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { ensureSelfPerson, listCreatorPeople } from "@/lib/people";
import { isAdminRole, isContributor } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// People + channels for the Save-dialog dropdowns and library filters.
export async function GET() {
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  // The current user's own creator record (created on first need) so the Save
  // dialog can default the creator to whoever is uploading. VIEWERs never save,
  // so we don't provision one for them.
  const mePersonId =
    g.user.role !== "VIEWER" ? await ensureSelfPerson(g.user) : null;
  // Contributors capture ideas under their own name only — the server forces it
  // too, this just stops the UI offering a choice that doesn't exist.
  const canChooseCreator = !isContributor(g.user.role);

  const [people, channels, accounts] = await Promise.all([
    // Creators = login members (one Person per member, auto-ensured).
    listCreatorPeople(g.user.workspaceId),
    prisma.socialChannel.findMany({
      where: { workspaceId: g.user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    prisma.account.findMany({
      where: { workspaceId: g.user.workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);

  return Response.json({
    people,
    channels,
    accounts,
    canEdit: g.user.role !== "VIEWER",
    mePersonId,
    canChooseCreator,
    // Admins may attribute content to any creator; everyone else is locked to
    // themselves (reassignable later via Edit).
    isAdmin: isAdminRole(g.user.role),
  });
}
