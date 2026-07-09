// Pure, client-safe activity formatting (no prisma import). The action catalog
// + the description formatter live here so both the server (logActivity, data
// layer) and the client ActivityPanel can use them.

export type ActivityCategory = "content" | "account" | "creator" | "platform";

type ActionDef = { category: ActivityCategory; verb: string };

export const ACTIONS = {
  "asset.created": { category: "content", verb: "saved" },
  "asset.updated": { category: "content", verb: "edited" },
  "asset.deleted": { category: "content", verb: "deleted" },
  "asset.restored": { category: "content", verb: "restored" },
  "asset.version_restored": { category: "content", verb: "restored a version of" },
  "asset.bulk_delete": { category: "content", verb: "moved to Trash" },
  "asset.bulk_restore": { category: "content", verb: "restored" },
  "asset.bulk_purge": { category: "content", verb: "permanently deleted" },
  "asset.bulk_setPerson": { category: "content", verb: "reassigned the creator of" },
  "asset.bulk_setTags": { category: "content", verb: "set tags on" },
  "asset.bulk_addTags": { category: "content", verb: "added tags to" },
  "creator.created": { category: "creator", verb: "added creator" },
  "creator.updated": { category: "creator", verb: "edited creator" },
  "creator.deleted": { category: "creator", verb: "removed creator" },
  "platform.created": { category: "platform", verb: "added platform" },
  "account.created": { category: "account", verb: "created account" },
  "account.role_changed": { category: "account", verb: "changed the role of" },
  "account.deactivated": { category: "account", verb: "deactivated" },
  "account.reactivated": { category: "account", verb: "reactivated" },
  "account.deleted": { category: "account", verb: "deleted account" },
  "account.password_reset": { category: "account", verb: "reset the password of" },
  "account.password_changed": { category: "account", verb: "changed their password" },
} as const satisfies Record<string, ActionDef>;

export type ActionKey = keyof typeof ACTIONS;

export const ACTIVITY_CATEGORIES: { key: ActivityCategory; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "account", label: "Accounts" },
  { key: "creator", label: "Creators" },
  { key: "platform", label: "Platforms" },
];

/** Pure: the predicate shown after the actor's name (e.g. `saved a blog post “X”`). */
export function describeActivity(row: {
  action: string;
  targetType?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const def = (ACTIONS as Record<string, ActionDef | undefined>)[row.action];
  let out = def?.verb ?? row.action;
  if (row.targetType) out += ` ${row.targetType}`;
  if (row.targetLabel) out += ` “${row.targetLabel}”`;
  const meta = row.metadata as Record<string, unknown> | null;
  if (
    (row.action === "account.role_changed" || row.action === "asset.bulk_setPerson") &&
    meta?.to
  )
    out += ` to ${meta.to}`;
  if (row.action === "account.deleted" && meta?.reassignTo)
    out += `, content reassigned to ${meta.reassignTo}`;
  return out;
}
