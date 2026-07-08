import type { Artifact } from "@/lib/ai/tools";

// Presentation helpers for artifacts (chat cards, reader, downloads, and the
// generated cover thumbnail). Kept UI-framework-free so both client and server
// (cover generation) can use the HTML/gradient bits.

const GRADIENTS: [string, string][] = [
  ["#43cea2", "#185a9d"],
  ["#ff9a8b", "#ff6a88"],
  ["#ffe259", "#ffa751"],
  ["#0e9f8f", "#0b6f88"],
  ["#7a4fc9", "#c9b8f5"],
  ["#fbc2eb", "#a6c1ee"],
  ["#2a6fb8", "#9cc3f0"],
];

export function gradientFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export function artifactGradient(artifact: Artifact): string {
  const [a, b] = gradientFor(artifact.title);
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/** Full HTML body for the reader / download / stored MediaAsset.html. */
export function artifactToHtml(artifact: Artifact): string {
  if (artifact.kind === "BLOGPOST") return artifact.html;
  if (artifact.kind === "THUMBNAIL") {
    const caps = artifact.captionOptions
      .map((c) => `<li>${escapeHtml(c)}</li>`)
      .join("");
    return `<h2>${escapeHtml(artifact.title)}</h2><h3>Caption options</h3><ol>${caps}</ol><h3>Design notes</h3><p>${escapeHtml(
      artifact.designNotes,
    )}</p>`;
  }
  // VIDEO_SCRIPT
  const secs = artifact.sections
    .map((s) => `<h3>${escapeHtml(s.heading)}</h3><p>${escapeHtml(s.body)}</p>`)
    .join("");
  return `<h2>${escapeHtml(artifact.title)}</h2>${secs}`;
}

/** Map an artifact kind to the default Save-dialog category. */
export function artifactDefaultCategory(artifact: Artifact): string {
  switch (artifact.kind) {
    case "BLOGPOST":
      return "BLOGPOST";
    case "THUMBNAIL":
      return "THUMBNAIL";
    case "VIDEO_SCRIPT":
      return "VIDEO";
    default:
      return "BLOGPOST";
  }
}

export function downloadArtifact(artifact: Artifact) {
  const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(
    artifact.title,
  )}</title>${artifactToHtml(artifact)}`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = slugify(artifact.title) + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
