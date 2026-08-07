import { promises as fs } from "fs";
import path from "path";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { storage, keyFromUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve the ORIGINAL stored file as a same-origin attachment. Originals live on
// remote storage (R2/S3) in prod; a plain <a download> pointing there is
// cross-origin, so browsers ignore the download attribute and fall back to the
// hashed storage key as the filename — which is identical to the thumbnail's
// basename and reads as "I got the thumbnail". Proxying through the app forces
// a real download carrying the asset's original filename.
/**
 * Types safe to render in the browser tab. Anything else is forced to download as
 * an opaque blob, because this route serves from the app's own origin: letting a
 * saver choose `text/html` (or an SVG, which scripts) would run their markup on
 * marketing.msquare.pro with every viewer's session attached.
 */
const INLINE_SAFE = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (!g.ok) return g.response;

  // ?inline=1 serves the file for in-browser viewing (PDF/image/text/video/
  // audio open in a new tab) instead of forcing a download.
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!asset || asset.deletedAt || !asset.url || asset.source === "LINK") {
    return new Response("Not found", { status: 404 });
  }

  const filename =
    asset.filename || `${asset.title}${path.extname(asset.url) || ""}`;

  let body: BodyInit;
  const size: number | null = asset.sizeBytes;
  if (asset.url.startsWith("/uploads/")) {
    const root = path.join(process.cwd(), "public", "uploads");
    const file = path.resolve(root, keyFromUrl(asset.url));
    if (!file.startsWith(root + path.sep)) {
      return new Response("Not found", { status: 404 });
    }
    try {
      body = new Uint8Array(await fs.readFile(file));
    } catch {
      return new Response("File unavailable", { status: 404 });
    }
  } else {
    // Read it back through the storage provider rather than fetching the stored
    // URL. `url` is a value someone saved, so fetching it verbatim would let a
    // saved asset point at anything the server can reach — an internal address,
    // a cloud metadata endpoint — and this route would stream the reply back to
    // them. Going through storage means only our own bucket is ever read.
    const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (!base || !asset.url.startsWith(base + "/")) {
      return new Response("File unavailable", { status: 404 });
    }
    try {
      body = new Uint8Array(await storage.getBytes(keyFromUrl(asset.url)));
    } catch {
      return new Response("File unavailable", { status: 404 });
    }
  }

  // ASCII fallback + RFC 5987 filename* so names with spaces/unicode survive.
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  // Only a known-safe type may be shown in the tab; everything else downloads as
  // an opaque blob whatever the asset claims its type is.
  const claimed = asset.mimeType || "";
  const safe = INLINE_SAFE.has(claimed);
  const headers = new Headers({
    "Content-Type": safe ? claimed : "application/octet-stream",
    "Content-Disposition": `${inline && safe ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store",
    // Belt and braces: stop the browser second-guessing the type we just forced.
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  if (size) headers.set("Content-Length", String(size));

  return new Response(body, { headers });
}
