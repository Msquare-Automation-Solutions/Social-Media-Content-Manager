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

// ── Admin / User surface (v1 accounts UI) ───────────────────────────────────
// The UI shows only two roles. OWNER/ADMIN read as "Admin", EDITOR as "User".
// The role a new/edited USER account maps to internally:
export const USER_ROLE: Role = "EDITOR";
export const ADMIN_ROLE: Role = "ADMIN";

/** Human label for the accounts table: "Admin" or "User". */
export function roleLabel(role: Role): "Admin" | "User" {
  return hasRole(role, "ADMIN") ? "Admin" : "User";
}

/** True when a role represents an admin (OWNER or ADMIN). */
export function isAdminRole(role: Role): boolean {
  return hasRole(role, "ADMIN");
}
