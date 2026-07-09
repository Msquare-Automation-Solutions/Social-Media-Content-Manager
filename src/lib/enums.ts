// Enum-like constants. Stored as String in SQLite (see schema.prisma header)
// and validated here so the app has a single source of truth.

export const ROLES = ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

// Higher index = more privilege. Used by requireRole (src/lib/roles.ts).
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export const ASSET_TYPES = [
  "IMAGE",
  "THUMBNAIL",
  "VIDEO",
  "BLOGPOST",
  "VIDEO_SCRIPT",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_SOURCES = ["UPLOAD", "GENERATED", "LINK"] as const;
export type AssetSource = (typeof ASSET_SOURCES)[number];

// Review workflow: content lands IN_QUEUE; an admin marks it APPROVED or REWORK.
export const ASSET_STATUSES = ["IN_QUEUE", "REWORK", "APPROVED"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const STATUS_LABELS: Record<AssetStatus, string> = {
  IN_QUEUE: "In queue",
  REWORK: "Rework",
  APPROVED: "Approved",
};

export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
