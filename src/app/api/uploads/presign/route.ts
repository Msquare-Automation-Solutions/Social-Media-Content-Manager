import crypto from "crypto";
import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(200),
});

// Hand the browser a short-lived URL to upload a file straight to storage (R2),
// so large files never pass through the serverless function (which caps request
// bodies at ~4.5 MB). Returns where to PUT and the resulting public URL.
export async function POST(req: Request) {
  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const { filename, contentType } = parsed.data;
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  const key = `files/${crypto.randomUUID()}${ext ? "." + ext : ""}`;

  const uploadUrl = await storage.presignUpload(key, contentType);
  return Response.json({ uploadUrl, publicUrl: storage.publicUrl(key), key });
}
