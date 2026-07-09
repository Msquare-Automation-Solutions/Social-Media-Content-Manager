import { describe, it, expect } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  passwordSchema,
  hashPassword,
  verifyPassword,
} from "@/lib/password";

describe("password helper", () => {
  it("enforces an 8-char minimum", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(passwordSchema.safeParse("short12").success).toBe(false); // 7 chars
    expect(passwordSchema.safeParse("longenough").success).toBe(true);
  });

  it("hashes and verifies a password round-trip", async () => {
    const hash = await hashPassword("secret-password");
    expect(hash).not.toBe("secret-password");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt hash
    expect(await verifyPassword("secret-password", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
