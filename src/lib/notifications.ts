import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";

export type NotificationEntry = {
  action: string; // e.g. "asset.approved" | "asset.reworked" | "asset.published"
  message: string; // pre-rendered summary, e.g. 'approved "Launch teaser"'
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
};

// Fan a notification out to a set of recipients. Actor fields are denormalized
// (like logActivity) and errors are swallowed — a notification failure must not
// break the underlying mutation. The actor is filtered out of recipients and
// the list is de-duplicated by the caller-supplied ids.
// Pure: the distinct recipients a notification actually goes to — de-duplicated
// and with the actor themselves removed (you don't get notified of your own act).
export function notificationTargets(actorId: string, recipientIds: string[]): string[] {
  return Array.from(new Set(recipientIds)).filter((id) => id && id !== actorId);
}

export async function createNotifications(
  actor: Pick<CurrentUser, "id" | "name" | "avatarColor" | "workspaceId">,
  recipientIds: string[],
  entry: NotificationEntry,
): Promise<void> {
  const recipients = notificationTargets(actor.id, recipientIds);
  if (recipients.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: recipients.map((recipientId) => ({
        workspaceId: actor.workspaceId,
        recipientId,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatarColor: actor.avatarColor,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        targetLabel: entry.targetLabel ?? null,
        message: entry.message,
      })),
    });
  } catch (err) {
    console.error("createNotifications failed", err);
  }
}

// Recipients for an asset review event: the uploader (the login user who saved
// it), the creator the content is *attributed to* (Person.userId, when that
// Person is linked to a login user), and every workspace admin (OWNER/ADMIN) —
// minus the actor (filtered later by createNotifications). Never throws.
export async function reviewNotificationRecipients(
  workspaceId: string,
  asset: { createdById: string; personId: string },
): Promise<string[]> {
  try {
    const [admins, person] = await Promise.all([
      prisma.membership.findMany({
        where: { workspaceId, role: { in: ["OWNER", "ADMIN"] } },
        select: { userId: true },
      }),
      prisma.person.findUnique({
        where: { id: asset.personId },
        select: { userId: true },
      }),
    ]);
    const ids = [asset.createdById, ...admins.map((a) => a.userId)];
    if (person?.userId) ids.push(person.userId);
    return ids;
  } catch (err) {
    console.error("reviewNotificationRecipients failed", err);
    return [asset.createdById];
  }
}

export type NotificationRow = {
  id: string;
  actorName: string;
  actorAvatarColor: string;
  action: string;
  message: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listNotifications(
  recipientId: string,
  { cursor, take = 20 }: { cursor?: string; take?: number } = {},
): Promise<{ rows: NotificationRow[]; nextCursor: string | null }> {
  const rows = await prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    rows: page.map((n) => ({
      id: n.id,
      actorName: n.actorName,
      actorAvatarColor: n.actorAvatarColor,
      action: n.action,
      message: n.message,
      targetType: n.targetType,
      targetId: n.targetId,
      targetLabel: n.targetLabel,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function unreadNotificationCount(recipientId: string): Promise<number> {
  return prisma.notification.count({ where: { recipientId, readAt: null } });
}
