import { readFileSync, existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

// One-off migration: assets seeded/created before R2 have thumbnailUrl pointing
// at local /uploads paths, which don't exist on Vercel (read-only FS) → broken
// previews. For each, upload the local thumbnail file to R2 if present, else
// generate a branded title-on-gradient cover, then repoint thumbnailUrl at R2.
//   npm run migrate:thumbs        (targets DATABASE_URL / .env)

// ── load .env into process.env ───────────────────────────────────────────────
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const s = line.trim();
  if (!s || s.startsWith("#")) continue;
  const i = s.indexOf("=");
  if (i === -1) continue;
  const k = s.slice(0, i).trim();
  const v = s.slice(i + 1).trim().replace(/^"|"$/g, "");
  if (!(k in process.env)) process.env[k] = v;
}

const PUBLIC_BASE = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const BUCKET = process.env.S3_BUCKET!;
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
const prisma = new PrismaClient();

const TYPE_LABELS: Record<string, string> = {
  IMAGE: "Image",
  THUMBNAIL: "Thumbnail",
  VIDEO: "Video",
  BLOGPOST: "Blog post",
  VIDEO_SCRIPT: "Video script",
};

// ── branded cover generation (mirrors src/lib/thumbnails.ts) ─────────────────
const GRADIENTS: [string, string][] = [
  ["#43cea2", "#185a9d"], ["#ff9a8b", "#ff6a88"], ["#ffe259", "#ffa751"],
  ["#0e9f8f", "#0b6f88"], ["#7a4fc9", "#c9b8f5"], ["#fbc2eb", "#a6c1ee"],
  ["#2a6fb8", "#9cc3f0"],
];
function gradientFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) { if (line) out.push(line); line = w; }
    else line = (line + " " + w).trim();
  }
  if (line) out.push(line);
  return out;
}
async function coverPng(title: string, label: string): Promise<Buffer> {
  const [c1, c2] = gradientFor(title);
  const lines = wrap(title, 22).slice(0, 3);
  const startY = 96 - (lines.length - 1) * 15;
  const tspans = lines.map((ln, i) => `<tspan x="32" y="${startY + i * 30}">${escapeHtml(ln)}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="400" height="225" fill="url(#g)"/>
  <text x="32" y="40" fill="#ffffff" opacity="0.8" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">${escapeHtml(label.toUpperCase())}</text>
  <text fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="700">${tspans}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function withRetry<T>(fn: () => Promise<T>, n = 6): Promise<T> {
  for (let i = 0; i < n; i++) {
    try { return await fn(); } catch (e) { if (i === n - 1) throw e; await new Promise((r) => setTimeout(r, 2500)); }
  }
  throw new Error("unreachable");
}

async function main() {
  if (!PUBLIC_BASE || !BUCKET) throw new Error("S3_PUBLIC_BASE_URL / S3_BUCKET missing in .env");

  const assets = await withRetry(() =>
    prisma.mediaAsset.findMany({
      where: { deletedAt: null, thumbnailUrl: { startsWith: "/uploads/" } },
      select: { id: true, title: true, type: true, thumbnailUrl: true },
    }),
  );
  console.log(`Found ${assets.length} assets with local /uploads thumbnails.`);

  let fromFile = 0, generated = 0;
  for (const a of assets) {
    const key = a.thumbnailUrl!.slice("/uploads/".length); // e.g. thumbs/foo.png
    const localPath = path.join(process.cwd(), "public", "uploads", key);
    let body: Buffer;
    if (existsSync(localPath)) {
      body = readFileSync(localPath);
      fromFile++;
    } else {
      body = await coverPng(a.title, TYPE_LABELS[a.type] ?? "Asset");
      generated++;
    }
    await withRetry(() =>
      s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "image/png" })),
    );
    const newUrl = `${PUBLIC_BASE}/${key}`;
    await withRetry(() => prisma.mediaAsset.update({ where: { id: a.id }, data: { thumbnailUrl: newUrl } }));
    console.log(`  ✓ ${a.title}  →  ${newUrl}`);
  }

  console.log(`\nDone. ${assets.length} thumbnails now on R2 (${fromFile} uploaded from local files, ${generated} generated covers).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
