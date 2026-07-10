import { promises as fs } from "fs";
import path from "path";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { keyFromUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serve the ORIGINAL stored file as a same-origin attachment. Originals live on
// remote storage (R2/S3) in prod; a plain <a download> pointing there is
// cross-origin, so browsers ignore the download attribute and fall back to the
// hashed storage key as the filename — which is identical to the thumbnail's
// basename and reads as "I got the thumbnail". Proxying through the app forces
// a real download carrying the asset's original filename.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await guard();
  if (!g.ok) return g.response;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!asset || asset.deletedAt || !asset.url || asset.source === "LINK") {
    return new Response("Not found", { status: 404 });
  }

  const filename =
    asset.filename || `${asset.title}${path.extname(asset.url) || ""}`;

  let body: BodyInit;
  let size: number | null = asset.sizeBytes;
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
    const upstream = await fetch(asset.url);
    if (!upstream.ok || !upstream.body) {
      return new Response("File unavailable", { status: 502 });
    }
    body = upstream.body;
    const len = upstream.headers.get("content-length");
    if (len) size = Number(len);
  }

  // ASCII fallback + RFC 5987 filename* so names with spaces/unicode survive.
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  const headers = new Headers({
    "Content-Type": asset.mimeType || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store",
  });
  if (size) headers.set("Content-Length", String(size));

  return new Response(body, { headers });
}
