import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/roles";
import type { Role } from "@/lib/enums";

export type GuardResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: Response };

/**
 * Resolve the current user and enforce a minimum role — server side. Role checks
 * live here, not just in hidden UI.
 *
 * The default is VIEWER, not "any authenticated user", so a route that forgets to
 * say what it needs still keeps out the CONTRIBUTOR role (Content Bin only). The
 * handful of endpoints contributors genuinely need pass "CONTRIBUTOR" explicitly.
 * Failing closed matters here: the cost of getting it wrong is a contributor being
 * denied something — obvious and harmless — rather than quiet over-exposure.
 */
export async function guard(minRole: Role = "VIEWER"): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }
  if (minRole && !hasRole(user.role, minRole)) {
    return {
      ok: false,
      response: new Response(`Requires ${minRole}`, { status: 403 }),
    };
  }
  return { ok: true, user };
}
