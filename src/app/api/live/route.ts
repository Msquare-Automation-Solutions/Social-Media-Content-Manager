import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  unread: bigint;
  top_id: string | null;
  act_id: string | null;
  asset_at: Date | null;
  task_at: Date | null;
};

/**
 * GET: the workspace's current "revision" — one cheap round trip the client polls
 * to decide whether anything changed. It replaces the old SSE stream, which held
 * a serverless function open for every connected tab (and so billed provisioned
 * memory by the hour). Five separate queries are folded into a single statement
 * so a poll is one database round trip.
 */
export async function GET() {
  const g = await guard();
  if (!g.ok) return g.response;

  const [row] = await prisma.$queryRaw<Row[]>`
    SELECT
      (SELECT COUNT(*) FROM "Notification" WHERE "recipientId" = ${g.user.id} AND "readAt" IS NULL) AS unread,
      (SELECT id FROM "Notification" WHERE "recipientId" = ${g.user.id} ORDER BY "createdAt" DESC LIMIT 1) AS top_id,
      (SELECT id FROM "ActivityLog" WHERE "workspaceId" = ${g.user.workspaceId} ORDER BY "createdAt" DESC LIMIT 1) AS act_id,
      (SELECT MAX("updatedAt") FROM "MediaAsset" WHERE "workspaceId" = ${g.user.workspaceId}) AS asset_at,
      (SELECT MAX("updatedAt") FROM "Task" WHERE "workspaceId" = ${g.user.workspaceId}) AS task_at
  `;

  const rev = [
    row?.act_id ?? "",
    row?.asset_at?.getTime() ?? 0,
    row?.task_at?.getTime() ?? 0,
  ].join(":");

  return Response.json(
    { unread: Number(row?.unread ?? 0), topId: row?.top_id ?? null, rev },
    { headers: { "Cache-Control": "no-store" } },
  );
}
