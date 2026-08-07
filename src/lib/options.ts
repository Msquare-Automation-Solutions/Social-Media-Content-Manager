import { prisma } from "@/lib/db";
import { ensureSelfPerson, listCreatorPeople } from "@/lib/people";
import { hasRole, isAdminRole, isContributor } from "@/lib/roles";
import type { CurrentUser } from "@/lib/session";

export type WorkspaceOptions = {
  people: { id: string; name: string; label?: string | null; avatarColor: string }[];
  channels: { id: string; name: string; icon: string; color: string }[];
  accounts: { id: string; name: string; icon: string; color: string }[];
  canEdit: boolean;
  mePersonId: string | null;
  canChooseCreator: boolean;
  canUploadFiles: boolean;
  isAdmin: boolean;
};

/**
 * The dropdown data every composer needs: creators, platforms, accounts, plus what
 * this user is allowed to do with them.
 *
 * Lives here rather than only in /api/options so pages can render it into the HTML
 * instead of making the browser ask for it afterwards. That matters more than it
 * sounds: the origin is a long way from the team, so a client-side fetch costs the
 * best part of a second, while doing it during the render costs one local query.
 */
export async function getWorkspaceOptions(user: CurrentUser): Promise<WorkspaceOptions> {
  // The user's own creator record (created on first need) so composers can default
  // the creator to whoever is capturing. VIEWERs never save, so skip provisioning.
  const mePersonId = user.role !== "VIEWER" ? await ensureSelfPerson(user) : null;

  const [people, channels, accounts] = await Promise.all([
    listCreatorPeople(user.workspaceId),
    prisma.socialChannel.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
    prisma.account.findMany({
      where: { workspaceId: user.workspaceId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);

  return {
    people,
    channels,
    accounts,
    canEdit: user.role !== "VIEWER",
    mePersonId,
    // Contributors capture under their own name; the server forces it either way.
    canChooseCreator: !isContributor(user.role),
    // Contributors capture text and links; uploads require EDITOR to match the
    // upload endpoints.
    canUploadFiles: hasRole(user.role, "EDITOR"),
    // Admins may attribute content to any creator; everyone else is locked to
    // themselves (reassignable later via Edit).
    isAdmin: isAdminRole(user.role),
  };
}
