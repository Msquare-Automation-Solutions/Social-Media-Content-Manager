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
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_SOURCES = ["UPLOAD", "GENERATED", "LINK"] as const;
export type AssetSource = (typeof ASSET_SOURCES)[number];

// Review workflow: content lands PENDING (pending approval); an admin marks it
// APPROVED or REWORK; a creator/admin then marks an approved item PUBLISHED once
// it's live. Editing any item resubmits it to PENDING.
export const ASSET_STATUSES = ["PENDING", "REWORK", "APPROVED", "PUBLISHED"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const STATUS_LABELS: Record<AssetStatus, string> = {
  PENDING: "Pending approval",
  REWORK: "Rework",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

// Content Bin lifecycle: a captured idea starts NEW; USED once promoted into a
// MediaAsset; DISCARDED when rejected (kept for reference, restorable). Stays in
// the bin (not the global Trash) unless hard-deleted.
export const BIN_STATUSES = ["NEW", "USED", "DISCARDED"] as const;
export type BinStatus = (typeof BIN_STATUSES)[number];

export const BIN_STATUS_LABELS: Record<BinStatus, string> = {
  NEW: "New",
  USED: "Used",
  DISCARDED: "Discarded",
};

export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
