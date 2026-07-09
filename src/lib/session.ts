import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/enums";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
};

/**
 * Resolve the logged-in user together with their (single, v1) workspace
 * membership. Returns null when not authenticated or without a membership.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { user: true, workspace: true },
  });
  if (!membership) return null;
  // Deactivated accounts lose access immediately, even mid-session.
  if (membership.user.disabledAt) return null;

  return {
    id: membership.user.id,
    email: membership.user.email,
    name: membership.user.name,
    avatarColor: membership.user.avatarColor,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace.name,
    role: membership.role as Role,
  };
}
