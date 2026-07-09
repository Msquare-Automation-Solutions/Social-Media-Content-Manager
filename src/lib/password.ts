import bcrypt from "bcryptjs";
import { z } from "zod";

// One place for password rules so the login, account-settings, admin-reset,
// admin-create, invite-accept, and token-reset paths stay consistent.

export const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_COST = 12;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
