import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { hasRole } from "@/lib/roles";
import type { Role } from "@/lib/enums";

export type GuardResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: Response };

/**
 * Resolve the current user and (optionally) enforce a minimum role — server
 * side. Role checks live here, not just in hidden UI.
 */
export async function guard(minRole?: Role): Promise<GuardResult> {
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
