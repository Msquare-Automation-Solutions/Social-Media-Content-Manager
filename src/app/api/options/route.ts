import { guard } from "@/lib/api-guard";
import { getWorkspaceOptions } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// People + channels + accounts for composer dropdowns and library filters.
// Pages that need this on first paint should render it in via getWorkspaceOptions
// instead of calling this — see the note in src/lib/options.ts.
export async function GET() {
  const g = await guard("CONTRIBUTOR");
  if (!g.ok) return g.response;

  return Response.json(await getWorkspaceOptions(g.user));
}
