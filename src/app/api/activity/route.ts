import { guard } from "@/lib/api-guard";
import { listActivity } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Paginated activity feed for the admin panel's "Load more".
export async function GET(req: Request) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const rows = await listActivity(g.user.workspaceId, {
    actorId: url.searchParams.get("actor") || undefined,
    category: url.searchParams.get("category") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    cursor: url.searchParams.get("cursor") || undefined,
  });
  return Response.json({ rows });
}
