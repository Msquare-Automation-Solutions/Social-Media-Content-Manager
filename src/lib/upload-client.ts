// Upload a file straight to storage (R2 in prod, a local route in dev) via a
// presigned URL, then return its public URL. This keeps large files out of the
// serverless function body (which is capped at ~4.5 MB on Vercel).
export async function uploadToStorage(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";

  const presign = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType }),
  });
  if (!presign.ok) throw new Error("Could not start the upload.");
  const { uploadUrl, publicUrl } = (await presign.json()) as {
    uploadUrl: string;
    publicUrl: string;
  };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) throw new Error("Upload failed.");

  return publicUrl;
}
