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

// ── Task pipeline (production workflow) ──────────────────────────────────────
// Production stages a task can move through (which apply depends on content
// type, see src/lib/tasks.ts). PUBLISHING/ANALYTICS/DONE are finish steps.
export const TASK_STAGES = ["CONTENT", "VIDEO", "GRAPHICS"] as const;
export type TaskStageKey = (typeof TASK_STAGES)[number];

// Board columns = production stages + the finish steps, in order.
export const TASK_BOARD_COLUMNS = [
  "CONTENT",
  "VIDEO",
  "GRAPHICS",
  "PUBLISHING",
  "ANALYTICS",
  "DONE",
] as const;
export type TaskColumn = (typeof TASK_BOARD_COLUMNS)[number];

export const STAGE_LABELS: Record<string, string> = {
  CONTENT: "Content",
  VIDEO: "Video",
  GRAPHICS: "Graphics",
  PUBLISHING: "Publishing",
  ANALYTICS: "Analytics",
  DONE: "Done",
};

// Assignee-driven work status (keeps the sheet's on-time/delay detail).
export const TASK_WORK_STATUSES = [
  "YTI",
  "WIP_ON_TRACK",
  "WIP_DELAY",
  "COMPLETED_ON_TIME",
  "COMPLETED_DELAY",
] as const;
export type TaskWorkStatus = (typeof TASK_WORK_STATUSES)[number];
export const TASK_WORK_LABELS: Record<TaskWorkStatus, string> = {
  YTI: "Yet to initiate",
  WIP_ON_TRACK: "WIP, on track",
  WIP_DELAY: "WIP, delayed",
  COMPLETED_ON_TIME: "Completed, on time",
  COMPLETED_DELAY: "Completed, delayed",
};

// Admin-driven review status of a stage.
export const TASK_REVIEW_STATUSES = ["NOT_SUBMITTED", "PENDING", "APPROVED", "REWORK"] as const;
export type TaskReviewStatus = (typeof TASK_REVIEW_STATUSES)[number];
export const TASK_REVIEW_LABELS: Record<TaskReviewStatus, string> = {
  NOT_SUBMITTED: "Not submitted",
  PENDING: "In review",
  APPROVED: "Approved",
  REWORK: "Needs rework",
};

// Task-level publish status.
export const TASK_PUBLISH_STATUSES = [
  "NOT_PUBLISHED",
  "PENDING",
  "PUBLISHED_ON_TIME",
  "PUBLISHED_DELAY",
] as const;
export type TaskPublishStatus = (typeof TASK_PUBLISH_STATUSES)[number];
export const TASK_PUBLISH_LABELS: Record<TaskPublishStatus, string> = {
  NOT_PUBLISHED: "Not published",
  PENDING: "Pending",
  PUBLISHED_ON_TIME: "Published, on time",
  PUBLISHED_DELAY: "Published, delayed",
};

export const CHAT_ROLES = ["user", "assistant"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
