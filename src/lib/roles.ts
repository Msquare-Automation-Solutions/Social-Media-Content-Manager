import { ROLE_RANK, type Role } from "@/lib/enums";

export class RoleError extends Error {
  constructor(
    public required: Role,
    public actual: Role | null,
  ) {
    super(
      actual
        ? `Requires ${required}; caller is ${actual}`
        : `Requires ${required}; caller has no membership`,
    );
    this.name = "RoleError";
  }
}

/** True if `actual` meets or exceeds `required` in the role hierarchy. */
export function hasRole(actual: Role | null | undefined, required: Role): boolean {
  if (!actual) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/**
 * Server-side gate. Throws RoleError unless `actual` meets `required`.
 * Returns the role on success so callers can chain.
 */
export function requireRole(actual: Role | null | undefined, required: Role): Role {
  if (!hasRole(actual, required)) {
    throw new RoleError(required, actual ?? null);
  }
  return actual as Role;
}

// ── Admin / User / Contributor surface (accounts UI) ────────────────────────
// OWNER/ADMIN read as "Admin", EDITOR as "User", CONTRIBUTOR as "Contributor".
export const USER_ROLE: Role = "EDITOR";
export const ADMIN_ROLE: Role = "ADMIN";
export const CONTRIBUTOR_ROLE: Role = "CONTRIBUTOR";

/** Human label for the accounts table. */
export function roleLabel(role: Role): "Admin" | "User" | "Contributor" {
  if (hasRole(role, "ADMIN")) return "Admin";
  return isContributor(role) ? "Contributor" : "User";
}

/**
 * True for the Content-Bin-only role. Their whole app is /content-bin and
 * /leaderboard; the (app) layout redirects them away from everything else.
 */
export function isContributor(role: Role | null | undefined): boolean {
  return role === "CONTRIBUTOR";
}

/** True when a role represents an admin (OWNER or ADMIN). */
export function isAdminRole(role: Role): boolean {
  return hasRole(role, "ADMIN");
}
