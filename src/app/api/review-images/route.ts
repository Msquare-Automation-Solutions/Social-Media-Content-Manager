import sharp from "sharp";
import { randomUUID } from "crypto";
import { guard } from "@/lib/api-guard";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 8 * 1024 * 1024; // 8 MB — a pasted screenshot, not a deliverable.

/**
 * POST: store an image pasted (or picked) into a review note — e.g. a screenshot
 * marking up what needs fixing. Returns the URL to embed in the note text.
 */
export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return new Response("No file", { status: 400 });
  if (!file.type.startsWith("image/")) return new Response("Images only", { status: 400 });
  if (file.size > MAX) return new Response("Image must be ≤ 8MB", { status: 400 });

  // Cap the long edge so a retina screenshot doesn't cost megabytes to load.
  const png = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const url = await storage.save(`review/${g.user.workspaceId}/${randomUUID()}.png`, png, "image/png");

  return Response.json({ url });
}
