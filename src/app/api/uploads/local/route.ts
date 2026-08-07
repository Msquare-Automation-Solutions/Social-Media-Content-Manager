import { promises as fs } from "fs";
import path from "path";
import { guard } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dev-only upload target for the local storage driver: the browser PUTs a file
// here and it's written under /public/uploads. In production STORAGE_DRIVER=s3,
// the browser PUTs directly to R2 instead, so this route is never used (and
// 404s if somehow hit).
export async function PUT(req: Request) {
  if (process.env.STORAGE_DRIVER === "s3") return new Response("Not found", { status: 404 });

  const g = await guard("EDITOR");
  if (!g.ok) return g.response;

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return new Response("Missing key", { status: 400 });

  const root = path.join(process.cwd(), "public", "uploads");
  const dest = path.resolve(root, key);
  if (!dest.startsWith(root + path.sep)) return new Response("Bad key", { status: 400 });

  const buf = Buffer.from(await req.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return new Response(null, { status: 204 });
}
