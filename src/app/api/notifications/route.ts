import { guard } from "@/lib/api-guard";
import { listNotifications, unreadNotificationCount } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in user's own notifications (bell dropdown + unread badge).
export async function GET(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const [{ rows, nextCursor }, unread] = await Promise.all([
    listNotifications(g.user.id, { cursor: url.searchParams.get("cursor") || undefined }),
    unreadNotificationCount(g.user.id),
  ]);
  return Response.json({ rows, nextCursor, unread });
}
