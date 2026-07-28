import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { makeAvatar } from "@/lib/thumbnails";
import { storage, keyFromUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 5 * 1024 * 1024; // 5 MB

// POST: upload/replace the current user's profile picture (multipart 'file').
export async function POST(req: Request) {
  const g = await guard();
  if (!g.ok) return g.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return new Response("No file", { status: 400 });
  if (!file.type.startsWith("image/")) return new Response("Images only", { status: 400 });
  if (file.size > MAX) return new Response("Image must be ≤ 5MB", { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const url = await makeAvatar(buf, `user-${g.user.id}-${Date.now()}`);

  const prev = await prisma.user.findUnique({ where: { id: g.user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: g.user.id }, data: { avatarUrl: url } });
  if (prev?.avatarUrl) await storage.delete(keyFromUrl(prev.avatarUrl)).catch(() => {});

  return Response.json({ avatarUrl: url });
}

// DELETE: remove the current user's profile picture (back to initials).
export async function DELETE() {
  const g = await guard();
  if (!g.ok) return g.response;
  const prev = await prisma.user.findUnique({ where: { id: g.user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: g.user.id }, data: { avatarUrl: null } });
  if (prev?.avatarUrl) await storage.delete(keyFromUrl(prev.avatarUrl)).catch(() => {});
  return Response.json({ ok: true });
}
