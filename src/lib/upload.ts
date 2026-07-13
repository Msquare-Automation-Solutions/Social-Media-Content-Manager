import type { UploadFileDraft } from "@/components/save/dialog-context";

// Client-side classification + validation for uploads. Auto-classify by MIME
// (changeable later in the Save dialog). Validate size limits per the spec.

const MAX_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO = 512 * 1024 * 1024; // 512 MB
const MAX_DOC = 25 * 1024 * 1024;

export type Classified =
  | { ok: true; draft: UploadFileDraft }
  | { ok: false; name: string; error: string };

let seq = 0;

export function classifyFile(file: File): Classified {
  const name = file.name;
  const mime = file.type;
  const lower = name.toLowerCase();

  let category: string;
  if (mime.startsWith("image/")) {
    if (file.size > MAX_IMAGE)
      return { ok: false, name, error: "Images must be ≤ 10 MB" };
    category = "IMAGE";
  } else if (mime.startsWith("video/")) {
    if (file.size > MAX_VIDEO)
      return { ok: false, name, error: "Videos must be ≤ 512 MB" };
    category = "VIDEO";
  } else if (
    /\.(md|markdown|html?|docx?|pdf)$/.test(lower) ||
    mime === "text/markdown" ||
    mime === "text/html" ||
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    if (file.size > MAX_DOC)
      return { ok: false, name, error: "Documents must be ≤ 25 MB" };
    category = "BLOGPOST";
  } else {
    return { ok: false, name, error: "Unsupported file type" };
  }

  return {
    ok: true,
    draft: {
      tempId: `up_${Date.now()}_${++seq}`,
      name,
      category,
      mimeType: mime || "application/octet-stream",
      sizeBytes: file.size,
      file,
      previewUrl: category === "IMAGE" ? URL.createObjectURL(file) : undefined,
    },
  };
}

export function classifyFiles(files: FileList | File[]): {
  drafts: UploadFileDraft[];
  errors: string[];
} {
  const drafts: UploadFileDraft[] = [];
  const errors: string[] = [];
  for (const f of Array.from(files)) {
    const c = classifyFile(f);
    if (c.ok) drafts.push(c.draft);
    else errors.push(`${c.name}: ${c.error}`);
  }
  return { drafts, errors };
}
