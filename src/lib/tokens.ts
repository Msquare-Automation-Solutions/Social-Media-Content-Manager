import crypto from "crypto";

/** A URL-safe random token and its SHA-256 hash (store the hash, email the raw). */
export function makeToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function baseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}
