import crypto from "crypto";
import { guard } from "@/lib/api-guard";
import { validateSaveAsset } from "@/lib/validation/save-asset";
import { createAsset } from "@/lib/assets";
import { storage, keyFromUrl } from "@/lib/storage";
import { makeImageThumbnail, generateCover, thumbKey } from "@/lib/thumbnails";
import { isDocx, htmlFromDocx } from "@/lib/docx";
import { TYPE_LABELS } from "@/lib/library";
import { slugify } from "@/lib/artifact-view";
import { parseTags } from "@/lib/json";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save an artifact or upload to the library (EDITOR+). Multipart form:
//   payload   — JSON (validated by validateSaveAsset)
//   thumbnail — optional custom cover image (File)
//   file      — optional uploaded asset file (File; Phase 4 uploads)
export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const form = await req.formData();
  const rawPayload = form.get("payload");
  if (typeof rawPayload !== "string") {
    return new Response("Missing payload", { status: 400 });
  }

  let payload: unknown;
  try {
    const obj = JSON.parse(rawPayload) as Record<string, unknown>;
    if (typeof obj.tags === "string") obj.tags = parseTags(obj.tags);
    payload = obj;
  } catch {
    return new Response("Invalid payload JSON", { status: 400 });
  }

  const result = validateSaveAsset(payload);
  if (!result.ok) {
    return Response.json({ errors: result.errors }, { status: 422 });
  }
  const data = result.data;

  const keyBase = thumbKey(data.title, crypto.randomUUID());
  const label = TYPE_LABELS[data.type] ?? data.type;

  // The original file (if any) was uploaded straight to storage by the browser;
  // its URL arrives in the payload. Pull the bytes back only when we actually
  // need them (image thumbnail / docx→html) — never for large videos.
  const uploadedMime = data.mimeType ?? "";
  const isImageUpload = Boolean(data.fileUrl) && uploadedMime.startsWith("image/");
  const isDocxUpload = Boolean(data.fileUrl) && isDocx(uploadedMime, data.filename);

  let fileBytes: Buffer | null = null;
  async function loadFileBytes(): Promise<Buffer | null> {
    if (fileBytes || !data.fileUrl) return fileBytes;
    try {
      fileBytes = await storage.getBytes(keyFromUrl(data.fileUrl));
    } catch (err) {
      console.error("failed to read uploaded file", err);
    }
    return fileBytes;
  }

  // Resolve the thumbnail: custom upload → uploaded image → generated cover.
  let thumbnailUrl: string;
  const custom = form.get("thumbnail");
  try {
    if (custom instanceof File) {
      thumbnailUrl = await makeImageThumbnail(Buffer.from(await custom.arrayBuffer()), keyBase);
    } else if (isImageUpload) {
      const buf = await loadFileBytes();
      thumbnailUrl = buf
        ? await makeImageThumbnail(buf, keyBase)
        : await generateCover(data.title, label, keyBase);
    } else {
      thumbnailUrl = await generateCover(data.title, label, keyBase);
    }
  } catch (err) {
    console.error("thumbnail generation failed, using generated cover", err);
    thumbnailUrl = await generateCover(data.title, label, keyBase);
  }

  // Uploaded file → its stored URL; otherwise a LINK asset keeps its external URL.
  const finalUrl = data.fileUrl ?? data.url ?? undefined;

  // Uploaded Word (.docx) → HTML so it renders in the in-app reader.
  let docHtml: string | null = null;
  if (isDocxUpload) {
    const buf = await loadFileBytes();
    if (buf) docHtml = await htmlFromDocx(buf);
  }

  try {
    const asset = await createAsset(
      { ...data, thumbnailUrl, url: finalUrl, ...(docHtml ? { html: docHtml } : {}) },
      { workspaceId: g.user.workspaceId, userId: g.user.id },
    );
    // Link the originating chat message (generated artifacts).
    void slugify;
    await logActivity(g.user, {
      action: "asset.created",
      targetType: (TYPE_LABELS[data.type] ?? data.type).toLowerCase(),
      targetId: asset.id,
      targetLabel: asset.title,
    });
    return Response.json(
      { id: asset.id, type: asset.type, title: asset.title },
      { status: 201 },
    );
  } catch (err) {
    console.error("createAsset failed", err);
    return new Response(
      err instanceof Error ? err.message : "Save failed",
      { status: 400 },
    );
  }
}
