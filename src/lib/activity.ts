import { prisma } from "@/lib/db";
import { serializeJson } from "@/lib/json";
import type { CurrentUser } from "@/lib/session";
import { ACTIONS, type ActionKey } from "@/lib/activity-format";

// Server-only entry point. Re-exports the pure catalog/formatter so existing
// imports of "@/lib/activity" keep working; client code should import from
// "@/lib/activity-format" directly (no prisma).
export {
  ACTIONS,
  ACTIVITY_CATEGORIES,
  describeActivity,
} from "@/lib/activity-format";
export type { ActionKey, ActivityCategory } from "@/lib/activity-format";

// logActivity records who did what; it never throws (a logging failure must not
// break the underlying mutation).
export async function logActivity(
  actor: Pick<CurrentUser, "id" | "name" | "avatarColor" | "workspaceId">,
  entry: {
    action: ActionKey;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const def = ACTIONS[entry.action];
    await prisma.activityLog.create({
      data: {
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorName: actor.name,
        actorAvatarColor: actor.avatarColor,
        action: entry.action,
        category: def.category,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        targetLabel: entry.targetLabel ?? null,
        metadata: entry.metadata ? serializeJson(entry.metadata) : null,
      },
    });
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
