import { promises as fs } from "fs";
import path from "path";

// StorageProvider abstraction. Dev writes to /public/uploads (served by Next at
// /uploads/*). Swap this module's guts for S3/R2 later without touching callers.

export interface StorageProvider {
  save(key: string, data: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
}

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

class LocalStorage implements StorageProvider {
  async save(key: string, data: Buffer): Promise<string> {
    const dest = path.join(UPLOADS_ROOT, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, data);
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const dest = path.join(UPLOADS_ROOT, key);
    await fs.rm(dest, { force: true });
  }
}

// Only "local" is implemented in v1; S3_* env is read by the future provider.
export const storage: StorageProvider = new LocalStorage();

/** Turn a stored public URL back into a storage key for deletion. */
export function keyFromUrl(url: string): string {
  return url.replace(/^\/uploads\//, "");
}
