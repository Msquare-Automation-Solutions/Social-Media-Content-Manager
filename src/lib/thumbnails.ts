import sharp from "sharp";
import { storage } from "@/lib/storage";
import { gradientFor, escapeHtml, slugify } from "@/lib/artifact-view";

// Every asset MUST have a thumbnail. Three paths:
//   - image upload      → sharp resize to ~400px, 16:9 cover  (PNG)
//   - custom upload      → same 16:9 cover pipeline           (PNG)
//   - text (blog/script/thumbnail) with no image → generated title-on-gradient
//     cover card                                              (PNG from SVG)
// Videos ideally use an ffmpeg poster frame; when ffmpeg is unavailable we fall
// back to a generated cover (see generateCover).

const THUMB_W = 400;
const THUMB_H = 225; // 16:9

/** Resize an uploaded image buffer to a 16:9 ~400px cover PNG and store it. */
export async function makeImageThumbnail(
  input: Buffer,
  keyBase: string,
): Promise<string> {
  const png = await sharp(input)
    .resize(THUMB_W, THUMB_H, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();
  return storage.save(`thumbs/${keyBase}.png`, png, "image/png");
}

/** Generate a branded title-on-gradient cover card and store it as PNG. */
export async function generateCover(
  title: string,
  label: string,
  keyBase: string,
): Promise<string> {
  const [c1, c2] = gradientFor(title);
  const svg = coverSvg(title, label, c1, c2);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return storage.save(`thumbs/${keyBase}.png`, png, "image/png");
}

function coverSvg(title: string, label: string, c1: string, c2: string): string {
  const lines = wrap(title, 22).slice(0, 3);
  const startY = 96 - (lines.length - 1) * 15;
  const tspans = lines
    .map(
      (ln, i) =>
        `<tspan x="32" y="${startY + i * 30}">${escapeHtml(ln)}</tspan>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_W}" height="${THUMB_H}" viewBox="0 0 ${THUMB_W} ${THUMB_H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="${THUMB_W}" height="${THUMB_H}" fill="url(#g)"/>
  <text x="32" y="40" fill="#ffffff" opacity="0.8" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" text-transform="uppercase">${escapeHtml(
    label.toUpperCase(),
  )}</text>
  <text fill="#ffffff" font-family="Sora, Arial, sans-serif" font-size="24" font-weight="700">${tspans}</text>
</svg>`;
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) out.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) out.push(line);
  return out;
}

export function thumbKey(title: string, id: string): string {
  return `${slugify(title)}-${id.slice(-6)}`;
}
