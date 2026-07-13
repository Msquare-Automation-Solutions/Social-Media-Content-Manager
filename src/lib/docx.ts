const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** True for .docx (Office Open XML). Legacy .doc is not convertible by mammoth. */
export function isDocx(mime?: string | null, name?: string | null): boolean {
  return mime === DOCX_MIME || (!!name && /\.docx$/i.test(name));
}

/**
 * Convert a .docx buffer to HTML for the in-app reader. Returns null on failure
 * so the caller can fall back to a plain downloadable file.
 */
export async function htmlFromDocx(buffer: Buffer): Promise<string | null> {
  try {
    // Lazy-load mammoth so read paths (GET/DELETE) don't pull in the heavy dep.
    const mammoth = (await import("mammoth")).default;
    const res = await mammoth.convertToHtml({ buffer });
    return res.value?.trim() ? res.value : null;
  } catch (err) {
    console.error("docx→html conversion failed", err);
    return null;
  }
}
