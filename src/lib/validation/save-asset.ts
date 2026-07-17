import { z } from "zod";
import { ASSET_TYPES, ASSET_SOURCES } from "@/lib/enums";

// Server-side Save-dialog validation. Shared so the API route and unit tests
// use the exact same rules. Key invariants from the spec:
//   - every asset has a human-readable Name (title)
//   - a Person is required
//   - at least one Social platform is required
//   - category (type) and source must be valid enum values

// A selected platform + its optional planned post date (ISO yyyy-mm-dd or full
// ISO). Multiple platforms per asset, each independently schedulable.
export const channelSelectionSchema = z.object({
  channelId: z.string().min(1),
  scheduledFor: z.string().datetime().nullish().or(z.literal("")),
});

export const saveAssetSchema = z
  .object({
    title: z.string().trim().min(1, "Name is required").max(200),
    type: z.enum(ASSET_TYPES),
    source: z.enum(ASSET_SOURCES),
    personId: z.string().min(1, "Person is required"),
    channels: z
      .array(channelSelectionSchema)
      .min(1, "Pick at least one social platform"),
    // Which account(s) the media is assigned to (Faasil, Jahar, Msquare, …).
    // Optional so existing/link content isn't blocked.
    accountIds: z.array(z.string().min(1)).max(30).default([]),
    tags: z.array(z.string().trim().min(1)).max(30).default([]),
    note: z.string().trim().max(2000).nullish(),
    html: z.string().optional(),
    chatMessageId: z.string().optional(),
    // Present for uploads; ignored for generated artifacts.
    filename: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    // Present for LINK assets (external file reference).
    url: z.string().url().optional(),
    // Present for uploads: the URL the file was already uploaded to (R2 direct
    // upload, or /uploads/... in dev). Not necessarily absolute, so no .url().
    fileUrl: z.string().optional(),
    // Pre-made cover image URL (e.g. a Content Bin screenshot promoted into an
    // asset). Used directly as the thumbnail when no custom/image upload is given.
    thumbnailUrl: z.string().optional(),
  })
  .refine((d) => d.source !== "LINK" || !!d.url, {
    message: "A link URL is required",
    path: ["url"],
  });

export type SaveAssetInput = z.infer<typeof saveAssetSchema>;

export type SaveValidationResult =
  | { ok: true; data: SaveAssetInput }
  | { ok: false; errors: Record<string, string> };

/** Validate raw input, returning field-keyed errors on failure. */
export function validateSaveAsset(raw: unknown): SaveValidationResult {
  const parsed = saveAssetSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
