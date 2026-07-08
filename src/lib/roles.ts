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
