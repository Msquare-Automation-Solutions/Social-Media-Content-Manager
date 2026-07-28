import { prisma } from "@/lib/db";

type SelfUser = {
  id: string;
  name: string;
  email: string;
  avatarColor?: string | null;
  workspaceId: string;
};

/**
 * The Person/creator record that represents a login user. Login users and
 * Person records are separate concepts (a Person can be a creator who never
 * logs in), but each login user gets one linked Person so new uploads and
 * generations can be attributed to the uploader by default. Created on first
 * need; idempotent.
 */
export async function ensureSelfPerson(user: SelfUser): Promise<string> {
  const existing = await prisma.person.findFirst({
    where: { workspaceId: user.workspaceId, userId: user.id },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    // An active user needs an assignable creator — un-archive if it was removed.
    if (existing.deletedAt) {
      await prisma.person.update({ where: { id: existing.id }, data: { deletedAt: null } });
    }
    return existing.id;
  }

  const created = await prisma.person.create({
    data: {
      workspaceId: user.workspaceId,
      name: user.name,
      email: user.email,
      userId: user.id,
      avatarColor: user.avatarColor ?? undefined,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Creators are unified with Members: every login member has exactly one linked
 * Person, and those are the only creators shown in pickers/filters. Ensure a
 * Person exists (and is active) for each member of the workspace, keeping its
 * name/email/avatar in sync with the member.
 */
export async function ensureMemberPeople(workspaceId: string): Promise<void> {
  const members = await prisma.membership.findMany({
    where: { workspaceId },
    select: { user: { select: { id: true, name: true, email: true, avatarColor: true, avatarUrl: true } } },
  });
  for (const m of members) {
    const u = m.user;
    const existing = await prisma.person.findFirst({
      where: { workspaceId, userId: u.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.person.update({
        where: { id: existing.id },
        data: { name: u.name, email: u.email, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl, deletedAt: null },
      });
    } else {
      await prisma.person.create({
        data: { workspaceId, userId: u.id, name: u.name, email: u.email, avatarColor: u.avatarColor, avatarUrl: u.avatarUrl },
      });
    }
  }
}

/** The creator list = member-backed Person records (after ensuring they exist). */
export async function listCreatorPeople(workspaceId: string) {
  await ensureMemberPeople(workspaceId);
  return prisma.person.findMany({
    where: { workspaceId, deletedAt: null, userId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, label: true, avatarColor: true, avatarUrl: true, userId: true },
  });
}
