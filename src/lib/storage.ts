import { promises as fs } from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// StorageProvider abstraction.
//   - Dev / STORAGE_DRIVER=local → writes to /public/uploads, served by Next at
//     /uploads/*.
//   - Prod / STORAGE_DRIVER=s3   → Cloudflare R2 (or any S3-compatible store);
//     objects are served from the bucket's public base URL.
// Callers (save-dialog, thumbnails, purge) never care which one is active.

export interface StorageProvider {
  save(key: string, data: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  // A short-lived URL the browser can PUT a file to directly (bypasses the
  // serverless request-body size limit for large uploads).
  presignUpload(key: string, contentType: string): Promise<string>;
  // The public URL an object at `key` is served from.
  publicUrl(key: string): string;
  // Read an object's bytes back (e.g. to thumbnail an image uploaded directly).
  getBytes(key: string): Promise<Buffer>;
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

  // Dev: the browser PUTs to a local route that writes into /public/uploads.
  async presignUpload(key: string): Promise<string> {
    return `/api/uploads/local?key=${encodeURIComponent(key)}`;
  }

  publicUrl(key: string): string {
    return `/uploads/${key}`;
  }

  async getBytes(key: string): Promise<Buffer> {
    return fs.readFile(path.join(UPLOADS_ROOT, key));
  }
}

// S3-compatible storage. For Cloudflare R2:
//   S3_ENDPOINT        = https://<accountid>.r2.cloudflarestorage.com
//   S3_REGION          = auto
//   S3_BUCKET          = your-bucket
//   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY = R2 API token
//   S3_PUBLIC_BASE_URL = https://pub-xxxx.r2.dev  (or a custom domain)
class S3Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicBase: string;

  constructor() {
    this.bucket = requireEnv("S3_BUCKET");
    this.publicBase = requireEnv("S3_PUBLIC_BASE_URL").replace(/\/$/, "");
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: requireEnv("S3_ENDPOINT"),
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }

  async save(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return `${this.publicBase}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async presignUpload(key: string, contentType: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 600 }, // 10 minutes
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async getBytes(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  return v;
}

export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();

/**
 * Turn a stored public URL back into a storage key for deletion. Handles both
 * local (/uploads/<key>) and S3 (<publicBase>/<key>) URL shapes.
 */
export function keyFromUrl(url: string): string {
  if (url.startsWith("/uploads/")) return url.slice("/uploads/".length);
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base && url.startsWith(base)) return url.slice(base.length + 1);
  // Fallback: strip scheme + host, leaving the path.
  return url.replace(/^https?:\/\/[^/]+\//, "");
}
