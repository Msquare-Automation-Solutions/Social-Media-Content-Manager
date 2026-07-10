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
